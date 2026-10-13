


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."has_program_access"("p_program_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ select exists (
  select 1 from public.programs p
  where p.id = p_program_id
    and (
      public.is_org_member(p.organization_id)
      or exists (
        select 1 from public.organization_programs op
        join public.program_user_access pua on pua.organization_id = op.organization_id and pua.catalog_program_id = op.catalog_program_id
        where op.program_id = p_program_id and op.status = 'active' and pua.user_id = auth.uid() and pua.status = 'active'
      )
    )
); $$;


ALTER FUNCTION "public"."has_program_access"("p_program_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_member"("p_organization_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ select exists (select 1 from public.organization_members om where om.organization_id = p_organization_id and om.user_id = auth.uid() and om.active = true); $$;


ALTER FUNCTION "public"."is_org_member"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_episode"("p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_leg     text  := p_payload -> 'episode' ->> 'legacy_id';
  v_prog    text  := p_payload -> 'episode' ->> 'program_legacy_id';
  v_prog_id uuid;
  v_ep_id   uuid;
  v_map     jsonb;
  v_rows    jsonb;
  v_keep    text[];
BEGIN
  IF v_leg IS NULL OR v_leg = '' THEN
    RAISE EXCEPTION 'save_episode: episode.legacy_id obrigatorio' USING ERRCODE = '22004';
  END IF;

  SELECT id INTO v_prog_id FROM public.programs WHERE legacy_id = v_prog;
  IF v_prog_id IS NULL THEN
    RAISE EXCEPTION 'save_episode: programa % nao encontrado', coalesce(v_prog, '(null)')
      USING ERRCODE = '23503';
  END IF;

  -- 1. episodes -------------------------------------------------------------
  v_map := public.tm_row_upsert('episodes', jsonb_build_array(
    (p_payload -> 'episode') || jsonb_build_object('program_id', v_prog_id::text)));
  v_ep_id := (v_map ->> v_leg)::uuid;

  -- 2. segments -------------------------------------------------------------
  SELECT coalesce(jsonb_agg(
           jsonb_set(s, '{episode_id}', to_jsonb(v_ep_id::text))
           || jsonb_build_object(
                'suggested_camera_id', (SELECT c.id::text FROM public.cameras c WHERE c.legacy_id = s ->> 'suggested_camera_legacy_id'))), '[]'::jsonb)
    INTO v_rows FROM jsonb_array_elements(coalesce(p_payload -> 'segments', '[]'::jsonb)) AS s;
  PERFORM public.tm_row_upsert('segments', v_rows);
  SELECT coalesce(array_agg(s ->> 'legacy_id'), ARRAY[]::text[]) INTO v_keep
    FROM jsonb_array_elements(coalesce(p_payload -> 'segments', '[]'::jsonb)) AS s;
  PERFORM public.tm_delete_missing('segments', 'episode_id', v_ep_id, v_keep);

  -- 3. participantes creditados que ainda nao tem linha (RISCO 8) -----------
  PERFORM public.tm_row_upsert('participants', coalesce(p_payload -> 'ensure_participants', '[]'::jsonb));

  -- 4. episode_participants -------------------------------------------------
  SELECT coalesce(jsonb_agg(
           jsonb_set(ep, '{episode_id}', to_jsonb(v_ep_id::text))
           || jsonb_build_object(
                'participant_id',   (SELECT p.id::text FROM public.participants p WHERE p.legacy_id = ep ->> 'participant_legacy_id'),
                'entry_segment_id', (SELECT s.id::text FROM public.segments    s WHERE s.legacy_id = ep ->> 'entry_segment_legacy_id'),
                'exit_segment_id',  (SELECT s.id::text FROM public.segments    s WHERE s.legacy_id = ep ->> 'exit_segment_legacy_id'))), '[]'::jsonb)
    INTO v_rows FROM jsonb_array_elements(coalesce(p_payload -> 'episode_participants', '[]'::jsonb)) AS ep;
  PERFORM public.tm_row_upsert('episode_participants', v_rows);
  SELECT coalesce(array_agg(ep ->> 'legacy_id'), ARRAY[]::text[]) INTO v_keep
    FROM jsonb_array_elements(coalesce(p_payload -> 'episode_participants', '[]'::jsonb)) AS ep;
  PERFORM public.tm_delete_missing('episode_participants', 'episode_id', v_ep_id, v_keep);

  -- 5. segment_participants (join pura, sem legacy_id) ----------------------
  IF jsonb_array_length(coalesce(p_payload -> 'segment_participants', '[]'::jsonb)) > 0 THEN
    EXECUTE $q$
      WITH src AS (
        SELECT s.id AS segment_id, pt.id AS participant_id, coalesce(sp.order_pos, 0) AS order_pos
        FROM jsonb_to_recordset($1) AS sp(segment_legacy_id text, participant_legacy_id text, order_pos integer)
        JOIN public.segments     s  ON s.legacy_id  = sp.segment_legacy_id
        JOIN public.participants pt ON pt.legacy_id = sp.participant_legacy_id
      )
      INSERT INTO public.segment_participants (segment_id, participant_id, order_pos)
      SELECT segment_id, participant_id, order_pos FROM src
      ON CONFLICT (segment_id, participant_id) DO UPDATE SET order_pos = EXCLUDED.order_pos
    $q$ USING p_payload -> 'segment_participants';
  END IF;

  -- 6. questions ------------------------------------------------------------
  SELECT coalesce(jsonb_agg(
           jsonb_set(q, '{episode_id}', to_jsonb(v_ep_id::text))
           || jsonb_build_object(
                'segment_id',     (SELECT s.id::text FROM public.segments    s WHERE s.legacy_id = q ->> 'segment_legacy_id'),
                'participant_id', (SELECT p.id::text FROM public.participants p WHERE p.legacy_id = q ->> 'participant_legacy_id'))), '[]'::jsonb)
    INTO v_rows FROM jsonb_array_elements(coalesce(p_payload -> 'questions', '[]'::jsonb)) AS q;
  PERFORM public.tm_row_upsert('questions', v_rows);
  SELECT coalesce(array_agg(q ->> 'legacy_id'), ARRAY[]::text[]) INTO v_keep
    FROM jsonb_array_elements(coalesce(p_payload -> 'questions', '[]'::jsonb)) AS q;
  PERFORM public.tm_delete_missing('questions', 'episode_id', v_ep_id, v_keep);

  -- 6b. question_follow_ups (filhos de questions) ---------------------------
  SELECT coalesce(jsonb_agg(jsonb_set(f, '{question_id}', to_jsonb(qq.id::text))), '[]'::jsonb)
    INTO v_rows
    FROM jsonb_array_elements(coalesce(p_payload -> 'follow_ups', '[]'::jsonb)) AS f
    JOIN public.questions qq ON qq.legacy_id = f ->> 'question_legacy_id';
  PERFORM public.tm_row_upsert('question_follow_ups', v_rows);

  -- 7. script_items ---------------------------------------------------------
  SELECT coalesce(jsonb_agg(
           jsonb_set(si, '{episode_id}', to_jsonb(v_ep_id::text))
           || jsonb_build_object(
                'segment_id',  (SELECT s.id::text FROM public.segments s WHERE s.legacy_id = si ->> 'segment_legacy_id'),
                'question_id', (SELECT q.id::text FROM public.questions q WHERE q.legacy_id = si ->> 'question_legacy_id'))), '[]'::jsonb)
    INTO v_rows FROM jsonb_array_elements(coalesce(p_payload -> 'script', '[]'::jsonb)) AS si;
  PERFORM public.tm_row_upsert('script_items', v_rows);
  SELECT coalesce(array_agg(si ->> 'legacy_id'), ARRAY[]::text[]) INTO v_keep
    FROM jsonb_array_elements(coalesce(p_payload -> 'script', '[]'::jsonb)) AS si;
  PERFORM public.tm_delete_missing('script_items', 'episode_id', v_ep_id, v_keep);

  -- 8. planned_shorts -------------------------------------------------------
  SELECT coalesce(jsonb_agg(
           jsonb_set(x, '{episode_id}', to_jsonb(v_ep_id::text))
           || jsonb_build_object(
                'segment_id', (SELECT s.id::text FROM public.segments s WHERE s.legacy_id = x ->> 'segment_legacy_id'))), '[]'::jsonb)
    INTO v_rows FROM jsonb_array_elements(coalesce(p_payload -> 'shorts', '[]'::jsonb)) AS x;
  PERFORM public.tm_row_upsert('planned_shorts', v_rows);
  SELECT coalesce(array_agg(x ->> 'legacy_id'), ARRAY[]::text[]) INTO v_keep
    FROM jsonb_array_elements(coalesce(p_payload -> 'shorts', '[]'::jsonb)) AS x;
  PERFORM public.tm_delete_missing('planned_shorts', 'episode_id', v_ep_id, v_keep);

  -- 9. production_assets ----------------------------------------------------
  SELECT coalesce(jsonb_agg(
           jsonb_set(x, '{episode_id}', to_jsonb(v_ep_id::text))
           || jsonb_build_object(
                'segment_id', (SELECT s.id::text FROM public.segments s WHERE s.legacy_id = x ->> 'segment_legacy_id'))), '[]'::jsonb)
    INTO v_rows FROM jsonb_array_elements(coalesce(p_payload -> 'assets', '[]'::jsonb)) AS x;
  PERFORM public.tm_row_upsert('production_assets', v_rows);
  SELECT coalesce(array_agg(x ->> 'legacy_id'), ARRAY[]::text[]) INTO v_keep
    FROM jsonb_array_elements(coalesce(p_payload -> 'assets', '[]'::jsonb)) AS x;
  PERFORM public.tm_delete_missing('production_assets', 'episode_id', v_ep_id, v_keep);

  -- 10. recording_markers ---------------------------------------------------
  SELECT coalesce(jsonb_agg(jsonb_set(x, '{episode_id}', to_jsonb(v_ep_id::text))), '[]'::jsonb)
    INTO v_rows FROM jsonb_array_elements(coalesce(p_payload -> 'markers', '[]'::jsonb)) AS x;
  PERFORM public.tm_row_upsert('recording_markers', v_rows);
  SELECT coalesce(array_agg(x ->> 'legacy_id'), ARRAY[]::text[]) INTO v_keep
    FROM jsonb_array_elements(coalesce(p_payload -> 'markers', '[]'::jsonb)) AS x;
  PERFORM public.tm_delete_missing('recording_markers', 'episode_id', v_ep_id, v_keep);

  RETURN jsonb_build_object('legacy_id', v_leg, 'id', v_ep_id::text, 'program_id', v_prog_id::text);
END;
$_$;


ALTER FUNCTION "public"."save_episode"("p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_episode"("p_payload" "jsonb") IS 'Grava o agregado inteiro do episodio (episodes + 7 tabelas filhas + deletes do que saiu do payload) em UMA transacao. Substitui o writeFileSync atomico do db.json. Retorna {legacy_id, id, program_id}.';



CREATE OR REPLACE FUNCTION "public"."save_program"("p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_legacy text := p_payload ->> 'legacy_id';
  v_map    jsonb;
  v_cams   jsonb;
  v_keep   text[];
BEGIN
  IF v_legacy IS NULL OR v_legacy = '' THEN
    RAISE EXCEPTION 'save_program: legacy_id obrigatorio' USING ERRCODE = '22004';
  END IF;

  v_map := public.tm_row_upsert('programs', jsonb_build_array(p_payload));

  SELECT coalesce(jsonb_agg(jsonb_set(c, '{program_id}', to_jsonb(v_map ->> v_legacy))), '[]'::jsonb)
    INTO v_cams
    FROM jsonb_array_elements(coalesce(p_payload -> 'cameras', '[]'::jsonb)) AS c;

  PERFORM public.tm_row_upsert('cameras', v_cams);

  SELECT coalesce(array_agg(c ->> 'legacy_id'), ARRAY[]::text[])
    INTO v_keep
    FROM jsonb_array_elements(coalesce(p_payload -> 'cameras', '[]'::jsonb)) AS c;

  -- cameras entra na lista de delete: sem isso, remover uma camera pela
  -- StudioSetupView nao apagaria a linha.
  PERFORM public.tm_delete_missing('cameras', 'program_id', (v_map ->> v_legacy)::uuid, v_keep);

  RETURN v_map;
END;
$$;


ALTER FUNCTION "public"."save_program"("p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_program"("p_payload" "jsonb") IS 'Grava programs + cameras atomicamente. Substitui o auto-seed do boot (db.ts) e o writeFileSync do db.json. Retorna {legacy_id: uuid}.';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_updated_at"() IS 'Trigger BEFORE UPDATE: mantém updated_at em UTC. Dependência registrada — remover exige dropar os triggers primeiro.';



CREATE OR REPLACE FUNCTION "public"."tm_delete_missing"("p_table" "text", "p_parent_col" "text", "p_parent_id" "uuid", "p_keep" "text"[]) RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_allowed constant text[] := ARRAY[
    'cameras', 'segments', 'episode_participants', 'questions',
    'question_follow_ups', 'script_items', 'planned_shorts',
    'production_assets', 'recording_markers'
  ];
  v_sql text;
  v_n   integer;
BEGIN
  IF p_table IS NULL OR p_table <> ALL (v_allowed) THEN
    RAISE EXCEPTION 'tm_delete_missing: tabela fora da allowlist: %', coalesce(p_table, '(null)')
      USING ERRCODE = '42501';
  END IF;
  IF p_parent_id IS NULL THEN
    RETURN 0;
  END IF;

  v_sql := format(
    'DELETE FROM public.%1$I WHERE %2$I = $1 '
    '  AND (legacy_id IS NULL OR NOT (legacy_id = ANY ($2::text[])))',
    p_table, p_parent_col
  );

  EXECUTE v_sql USING p_parent_id, coalesce(p_keep, ARRAY[]::text[]);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$_$;


ALTER FUNCTION "public"."tm_delete_missing"("p_table" "text", "p_parent_col" "text", "p_parent_id" "uuid", "p_keep" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tm_delete_missing"("p_table" "text", "p_parent_col" "text", "p_parent_id" "uuid", "p_keep" "text"[]) IS 'Apaga os filhos cujo legacy_id saiu do payload. Usar sempre depois do upsert das linhas novas.';



CREATE OR REPLACE FUNCTION "public"."tm_row_upsert"("p_table" "text", "p_rows" "jsonb", "p_conflict" "text"[] DEFAULT ARRAY['legacy_id'::"text"]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_allowed constant text[] := ARRAY[
    'programs', 'cameras', 'participants', 'episodes', 'segments',
    'episode_participants', 'questions', 'question_follow_ups', 'script_items',
    'planned_shorts', 'production_assets', 'recording_markers',
    'agenda_events', 'library_assets'
  ];
  v_cols   text;
  v_update text;
  v_sql    text;
  v_map    jsonb;
BEGIN
  IF p_table IS NULL OR p_table <> ALL (v_allowed) THEN
    RAISE EXCEPTION 'tm_row_upsert: tabela fora da allowlist: %', coalesce(p_table, '(null)')
      USING ERRCODE = '42501';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Colunas do INSERT: as chaves da linha que sao colunas reais da tabela.
  --   - A lista e explicita porque jsonb_populate_recordset NAO aplica o
  --     DEFAULT das colunas ausentes: sem a lista, `id uuid NOT NULL DEFAULT
  --     gen_random_uuid()` chegaria como NULL e o insert estouraria
  --     "null value in column id" (observado na 1a execucao do seed).
  --   - Chave que nao e coluna e descartada. Sem este filtro, save_program
  --     passaria a chave 'cameras' do payload como se fosse coluna de
  --     programs e o ON CONFLICT estouraria com
  --     "column excluded.cameras does not exist" (tambem observado).
  SELECT string_agg(format('%I', k), ', ') INTO v_cols
    FROM jsonb_object_keys(p_rows -> 0) AS k
   WHERE EXISTS (
     SELECT 1 FROM pg_attribute a
      WHERE a.attrelid = to_regclass('public.' || p_table)  -- schema explicito: search_path da funcao e vazio
        AND a.attname  = k
        AND a.attnum   > 0
        AND NOT a.attisdropped
   );
  IF v_cols IS NULL THEN
    RAISE EXCEPTION 'tm_row_upsert: nenhuma chave de % corresponde a uma coluna', p_table
      USING ERRCODE = '22023';
  END IF;

  -- Colunas do SET: as mesmas, menos a chave de conflito.
  -- Chave ausente do jsonb NAO e tocada: e o que faz o PUT parcial
  -- (App.tsx:181 manda so {defaultCameras}) nao apagar o resto da linha.
  SELECT string_agg(format('%1$I = EXCLUDED.%1$I', k), ', ')
    INTO v_update
    FROM jsonb_object_keys(p_rows -> 0) AS k
   WHERE k <> ALL (p_conflict)
     AND EXISTS (
       SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = to_regclass('public.' || p_table)
          AND a.attname  = k
          AND a.attnum   > 0
          AND NOT a.attisdropped
     );

  v_sql := format(
    'WITH src AS (SELECT * FROM jsonb_populate_recordset(NULL::public.%1$I, $1)), '
    ' ins AS (INSERT INTO public.%1$I (%2$s) SELECT %2$s FROM src '
    '          ON CONFLICT (%3$s) DO UPDATE SET %4$s '
    '          RETURNING legacy_id, id) '
    ' SELECT coalesce(jsonb_object_agg(legacy_id, id::text), ''{}''::jsonb) '
    '   FROM ins WHERE legacy_id IS NOT NULL',
    p_table, v_cols, array_to_string(p_conflict, ', '), v_update
  );

  EXECUTE v_sql INTO v_map USING p_rows;
  RETURN coalesce(v_map, '{}'::jsonb);
END;
$_$;


ALTER FUNCTION "public"."tm_row_upsert"("p_table" "text", "p_rows" "jsonb", "p_conflict" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tm_row_upsert"("p_table" "text", "p_rows" "jsonb", "p_conflict" "text"[]) IS 'Upsert set-based reutilizavel. Identificadores via format(%I), valores via parametro. Allowlist de 14 tabelas de dominio. Retorna {legacy_id: uuid}.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agenda_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "title" "text",
    "episode_id" "uuid",
    "program_title" "text",
    "episode_title" "text",
    "scheduled_date" "date",
    "scheduled_time" time without time zone,
    "duration_min" integer,
    "location" "text",
    "type" "text" NOT NULL,
    "status" "text",
    "notes" "text",
    "participants_summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "program_id" "uuid",
    CONSTRAINT "agenda_events_duration_min_check" CHECK (("duration_min" > 0)),
    CONSTRAINT "agenda_events_status_check" CHECK ((("status" IS NULL) OR ("status" = ANY (ARRAY['confirmado'::"text", 'pendente'::"text", 'concluido'::"text", 'cancelado'::"text"])))),
    CONSTRAINT "agenda_events_type_check" CHECK (("type" = ANY (ARRAY['recording'::"text", 'rehearsal'::"text", 'meeting'::"text", 'deadline'::"text"])))
);


ALTER TABLE "public"."agenda_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."agenda_events" IS 'Agenda de producao. SET NULL em episode_id: cancelar o episodio nao pode apagar o agendamento (call sheet).';



COMMENT ON COLUMN "public"."agenda_events"."scheduled_date" IS 'Canonico do par date/scheduledDate. INCONSISTENCIA REAL do modelo: o seed de db.ts grava `date`, AgendaView.tsx:46 grava `scheduledDate`, e DashboardView.tsx:48 ordena por scheduledDate. A coluna canonica e esta; a DAL mapeia os dois aliases.';



CREATE TABLE IF NOT EXISTS "public"."ai_generations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "program_id" "uuid",
    "episode_id" "uuid",
    "kind" "text" NOT NULL,
    "model" "text",
    "prompt" "jsonb",
    "result" "jsonb",
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "applied_at" timestamp with time zone,
    "applied_by" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_generations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'applied'::"text"])))
);


ALTER TABLE "public"."ai_generations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asset_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" "uuid",
    "episode_id" "uuid",
    "program_id" "uuid",
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."asset_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asset_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text",
    "episode_id" "uuid",
    "program_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."asset_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" bigint NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "table_name" "text",
    "row_id" "uuid",
    "episode_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


ALTER TABLE "public"."audit_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cameras" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "program_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text",
    "label" "text",
    "position" "text",
    "framing" "text",
    "purpose" "text",
    "shot_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "shot_type" "text",
    "notes" "text",
    "target" "text",
    "type" "text",
    "focal_length" "text",
    "lens_notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cameras_type_check" CHECK (("type" = ANY (ARRAY['close'::"text", 'medium'::"text", 'wide'::"text", 'overhead'::"text", 'mobile'::"text"])))
);


ALTER TABLE "public"."cameras" OWNER TO "postgres";


COMMENT ON TABLE "public"."cameras" IS 'CameraConfig. Episode.cameras e o mesmo conjunto herdado do programa - a DAL projeta a partir de cameras WHERE program_id = ...';



COMMENT ON COLUMN "public"."cameras"."sort_order" IS 'Ordem do array CameraConfig (indice). CAM 1..CAM 5 e ordem de producao, nao pode ser indefinida.';



CREATE TABLE IF NOT EXISTS "public"."commercial_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "billing_period" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "price_cents" integer,
    "currency" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."commercial_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crew_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text",
    "email" "text",
    "phone" "text",
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crew_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."episode_crew" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid" NOT NULL,
    "crew_member_id" "uuid" NOT NULL,
    "role" "text",
    "status" "text" DEFAULT 'assigned'::"text" NOT NULL,
    "call_time" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "episode_crew_status_check" CHECK (("status" = ANY (ARRAY['assigned'::"text", 'confirmed'::"text", 'arrived'::"text", 'absent'::"text"])))
);


ALTER TABLE "public"."episode_crew" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."episode_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "episode_id" "uuid" NOT NULL,
    "participant_id" "uuid",
    "name" "text" NOT NULL,
    "type" "text",
    "role" "text",
    "order_pos" integer DEFAULT 0 NOT NULL,
    "entry_segment_id" "uuid",
    "exit_segment_id" "uuid",
    "notes" "text",
    "is_featured" boolean DEFAULT false NOT NULL,
    "estimated_time_min" integer,
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "episode_participants_estimated_time_min_check" CHECK (("estimated_time_min" >= 0)),
    CONSTRAINT "episode_participants_order_pos_check" CHECK (("order_pos" >= 0))
);


ALTER TABLE "public"."episode_participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."episode_participants" IS 'Credito de participacao no episodio. SET NULL em participant_id: excluir o convidado do programa nao pode apagar o credito de quem ja foi escalado - e `name` NOT NULL preserva a identidade desnormalizada que o EpisodeParticipant ja carregava.';



CREATE TABLE IF NOT EXISTS "public"."episode_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "snapshot" "jsonb" NOT NULL,
    "changed_by" "uuid",
    "change_summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."episode_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."episodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "program_id" "uuid" NOT NULL,
    "episode_number" integer NOT NULL,
    "title" "text" NOT NULL,
    "idea" "text" NOT NULL,
    "topic" "text",
    "synopsis" "text",
    "format" "text" NOT NULL,
    "target_duration_min" integer,
    "target_duration_minutes" integer,
    "presenter_name" "text",
    "host" "text" NOT NULL,
    "tone" "text",
    "objective" "text",
    "additional_info" "text",
    "status" "text" NOT NULL,
    "diagnosis" "jsonb" NOT NULL,
    "research" "jsonb" NOT NULL,
    "technical_checklist" "jsonb",
    "editorial_notes_for_post" "text",
    "editor_script_synthesis" "text",
    "recording_time_elapsed" integer,
    "scheduled_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "checklist" "jsonb",
    "season_id" "uuid",
    "production_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "guest_name" "text",
    "guest_id" "uuid",
    CONSTRAINT "episodes_checklist_is_array" CHECK ((("checklist" IS NULL) OR ("jsonb_typeof"("checklist") = 'array'::"text"))),
    CONSTRAINT "episodes_diagnosis_is_object" CHECK ((("diagnosis" IS NULL) OR ("jsonb_typeof"("diagnosis") = 'object'::"text"))),
    CONSTRAINT "episodes_format_check" CHECK (("format" = ANY (ARRAY['Entrevista'::"text", 'Programa Solo'::"text", 'Mesa Redonda'::"text", 'Podcast/Videocast'::"text", 'Debate'::"text", 'Reportagem'::"text", 'Especial'::"text", 'Outro'::"text"]))),
    CONSTRAINT "episodes_recording_time_elapsed_check" CHECK (("recording_time_elapsed" >= 0)),
    CONSTRAINT "episodes_research_is_object" CHECK ((("research" IS NULL) OR ("jsonb_typeof"("research") = 'object'::"text"))),
    CONSTRAINT "episodes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'diagnosis'::"text", 'research'::"text", 'outline'::"text", 'scripting'::"text", 'ready'::"text", 'recording'::"text", 'recorded'::"text", 'editing'::"text", 'published'::"text"]))),
    CONSTRAINT "episodes_target_duration_min_check" CHECK (("target_duration_min" >= 0)),
    CONSTRAINT "episodes_target_duration_minutes_check" CHECK (("target_duration_minutes" >= 0)),
    CONSTRAINT "episodes_technical_checklist_is_object" CHECK ((("technical_checklist" IS NULL) OR ("jsonb_typeof"("technical_checklist") = 'object'::"text")))
);


ALTER TABLE "public"."episodes" OWNER TO "postgres";


COMMENT ON TABLE "public"."episodes" IS 'Raiz do episodio. Os arrays aninhados do Episode viram tabelas filhas; os 3 blocos de valor livre ficam em jsonb.';



COMMENT ON COLUMN "public"."episodes"."format" IS 'ProgramFormat em text SEM CHECK: /api/ai/interpret-idea devolve suggestedFormat e parseAIJson<any> nao valida. CHECK aqui quebraria o insert em resposta fora do union.';



COMMENT ON COLUMN "public"."episodes"."diagnosis" IS 'EditorialDiagnosis - objeto de valor 1:1, editado como form inteiro (DiagnosisTab), nunca filtrado nem agregado.';



COMMENT ON COLUMN "public"."episodes"."research" IS 'ResearchData - 1:1 com o episodio; sources[]/facts[] sao lidos no .map() so para style (EpisodeOverviewWorkspace.tsx:471), nunca para filtrar. Normalizar sources criaria tabela sem consulta.';



COMMENT ON COLUMN "public"."episodes"."technical_checklist" IS 'JSONB por decisao: 13 booleanos escritos por chave computada ({...checklist, [key]: !checklist[key]} em RecordingPrepTab.tsx:88), index signature [key: string]: any, e customItems[] de texto livre do usuario. Tabela filha obrigaria o toggle a conhecer nomes de coluna; 13 colunas fixas quebrariam a cada chave nova. CHECK de jsonb_typeof garante objeto.';



COMMENT ON COLUMN "public"."episodes"."scheduled_date" IS 'Episode.scheduledDate existe no tipo mas nenhum endpoint atual escreve. Mantido para nao encolher o contrato de resposta.';



COMMENT ON COLUMN "public"."episodes"."checklist" IS 'Episode.checklist (ChecklistItem[] - categories audio/video/content/guest). Escrito por EpisodeProductionWorkspace.tsx. Distinto de technical_checklist, que e o objeto de 13 booleanos da RecordingPrepTab. jsonb: lista curta, editada como bloco, nunca consultada por elemento.';



COMMENT ON COLUMN "public"."episodes"."guest_name" IS 'Optional guest name for display when not linked to a participant';



COMMENT ON COLUMN "public"."episodes"."guest_id" IS 'Optional link to a participant in participants table';



CREATE TABLE IF NOT EXISTS "public"."library_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "program_id" "uuid",
    "title" "text" NOT NULL,
    "category" "text",
    "type" "text",
    "description" "text",
    "content" "text",
    "url" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    CONSTRAINT "library_assets_category_check" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['vinheta'::"text", 'trilha'::"text", 'gc_template'::"text", 'b_roll'::"text", 'cenario'::"text", 'roteiro_modelo'::"text"])))),
    CONSTRAINT "library_assets_type_check" CHECK ((("type" IS NULL) OR ("type" = ANY (ARRAY['lower_third'::"text", 'video_bumper'::"text", 'audio_cue'::"text", 'overlay_graphic'::"text", 'template'::"text"]))))
);


ALTER TABLE "public"."library_assets" OWNER TO "postgres";


COMMENT ON TABLE "public"."library_assets" IS 'Biblioteca de material. SET NULL em program_id: o seed lib-4 e generico (sem programa) e material avulso sobrevive a exclusao do programa.';



CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'producer'::"text", 'editorial'::"text", 'host'::"text", 'production'::"text", 'camera'::"text", 'post_production'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_programs" (
    "organization_id" "uuid" NOT NULL,
    "catalog_program_id" "uuid" NOT NULL,
    "subscription_id" "uuid",
    "program_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_programs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'paused'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."organization_programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "external_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['trial'::"text", 'active'::"text", 'paused'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."organization_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organizations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "program_id" "uuid",
    "name" "text" NOT NULL,
    "type" "text",
    "group_type" "text",
    "role" "text" NOT NULL,
    "company_or_group" "text",
    "company" "text" NOT NULL,
    "bio" "text" NOT NULL,
    "members" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "contacts" "text" NOT NULL,
    "notes" "text" NOT NULL,
    "links" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "entity_type" "text",
    "social_handles" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "previous_episodes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "previous_research_summary" "text",
    CONSTRAINT "participants_entity_type_check" CHECK ((("entity_type" IS NULL) OR ("entity_type" = ANY (ARRAY['individual'::"text", 'group'::"text", 'band'::"text", 'organization'::"text", 'institution'::"text"])))),
    CONSTRAINT "participants_group_type_check" CHECK (("group_type" = ANY (ARRAY['band'::"text", 'duo'::"text", 'group'::"text", 'crew'::"text", 'choir'::"text"]))),
    CONSTRAINT "participants_social_handles_is_object" CHECK (("jsonb_typeof"("social_handles") = 'object'::"text"))
);


ALTER TABLE "public"."participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."participants" IS 'Participant/Guest. Alias Guest = Participant e a mesma linha.';



COMMENT ON COLUMN "public"."participants"."type" IS 'ParticipantType (19 valores) deixado em text: o union e amplo e nenhum caminho generativo escreve aqui.';



COMMENT ON COLUMN "public"."participants"."social_handles" IS 'Record<string,string> com chaves de plataforma arbitrarias (instagram, x, tiktok...). Nunca filtrado nem agregado.';



CREATE TABLE IF NOT EXISTS "public"."plan_programs" (
    "plan_id" "uuid" NOT NULL,
    "catalog_program_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."planned_shorts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "episode_id" "uuid" NOT NULL,
    "segment_id" "uuid",
    "title" "text" NOT NULL,
    "hook" "text",
    "suggested_hook" "text",
    "narrative_arc" "text",
    "generating_question" "text",
    "target_participant" "text",
    "estimated_duration" "text",
    "expected_duration_seconds" integer,
    "camera_focus" "text",
    "b_roll_notes" "text",
    "target_platform" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "planned_shorts_expected_duration_seconds_check" CHECK (("expected_duration_seconds" >= 0)),
    CONSTRAINT "planned_shorts_status_check" CHECK ((("status" IS NULL) OR ("status" = ANY (ARRAY['Planejado'::"text", 'Capturado'::"text", 'Excelente'::"text", 'Não aconteceu'::"text"]))))
);


ALTER TABLE "public"."planned_shorts" OWNER TO "postgres";


COMMENT ON TABLE "public"."planned_shorts" IS 'PlannedShort. Alias Episode.plannedShorts e a mesma colecao.';



COMMENT ON COLUMN "public"."planned_shorts"."estimated_duration" IS 'Alias textual ("50s") coexiste com expected_duration_seconds (numerico). Os dois mapeados; o canonico e o numerico.';



CREATE TABLE IF NOT EXISTS "public"."postproduction_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid" NOT NULL,
    "stage" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "assigned_crew_member_id" "uuid",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "postproduction_jobs_stage_check" CHECK (("stage" = ANY (ARRAY['material_received'::"text", 'backup'::"text", 'editing'::"text", 'review'::"text", 'approval'::"text", 'master'::"text", 'publication'::"text"]))),
    CONSTRAINT "postproduction_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'blocked'::"text", 'done'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."postproduction_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "episode_id" "uuid" NOT NULL,
    "segment_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "content" "text",
    "display_time" "text",
    "moment" "text",
    "status" "text",
    "file_url" "text",
    "notes" "text",
    "block_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "production_assets_status_check" CHECK ((("status" IS NULL) OR ("status" = ANY (ARRAY['pendente'::"text", 'em_busca'::"text", 'obtido'::"text", 'aprovado'::"text"]))))
);


ALTER TABLE "public"."production_assets" OWNER TO "postgres";


COMMENT ON TABLE "public"."production_assets" IS 'ProductionAsset/ProductionMaterial. Alias Episode.materials e a mesma colecao. `type` e texto livre de proposito (o tipo TS e string, e o seed usa "foto", "musica").';



CREATE TABLE IF NOT EXISTS "public"."production_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "program_id" "uuid",
    "episode_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "status" "text" DEFAULT 'todo'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "assigned_crew_member_id" "uuid",
    "due_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "production_tasks_check" CHECK ((("episode_id" IS NOT NULL) OR ("program_id" IS NOT NULL))),
    CONSTRAINT "production_tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "production_tasks_status_check" CHECK (("status" = ANY (ARRAY['todo'::"text", 'in_progress'::"text", 'blocked'::"text", 'done'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."production_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "host" "text",
    "format" "text",
    "source_name" "text" DEFAULT 'RS Play TV'::"text" NOT NULL,
    "source_url" "text",
    "source_scraped_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "contractable" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."program_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_crew" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "crew_member_id" "uuid" NOT NULL,
    "role" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."program_crew" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_user_access" (
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "catalog_program_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'representative'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "program_user_access_role_check" CHECK (("role" = ANY (ARRAY['representative'::"text", 'producer'::"text", 'editor'::"text", 'admin'::"text"]))),
    CONSTRAINT "program_user_access_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."program_user_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "name" "text" NOT NULL,
    "title" "text",
    "description" "text" NOT NULL,
    "host" "text" NOT NULL,
    "default_presenter_name" "text",
    "format" "text" NOT NULL,
    "default_duration_min" integer,
    "default_episode_duration_minutes" integer,
    "editorial_style" "text" NOT NULL,
    "target_audience" "text",
    "tone" "text",
    "scenario" "text" NOT NULL,
    "standard_structure" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "default_opening" "text" NOT NULL,
    "default_closing" "text" NOT NULL,
    "default_segments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "standard_segments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    "catalog_program_id" "uuid",
    CONSTRAINT "programs_default_duration_min_check" CHECK (("default_duration_min" >= 0)),
    CONSTRAINT "programs_default_episode_duration_minutes_check" CHECK (("default_episode_duration_minutes" >= 0)),
    CONSTRAINT "programs_default_segments_is_array" CHECK (("jsonb_typeof"("default_segments") = 'array'::"text")),
    CONSTRAINT "programs_format_check" CHECK (("format" = ANY (ARRAY['Entrevista'::"text", 'Programa Solo'::"text", 'Mesa Redonda'::"text", 'Podcast/Videocast'::"text", 'Debate'::"text", 'Reportagem'::"text", 'Especial'::"text", 'Outro'::"text"]))),
    CONSTRAINT "programs_standard_segments_is_array" CHECK (("jsonb_typeof"("standard_segments") = 'array'::"text"))
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


COMMENT ON TABLE "public"."programs" IS 'Programas/Shows. Alias Show = Program e a mesma linha. RLS ligado sem policy: deny-all para anon/authenticated, service_role tem BYPASSRLS. Caminho para multiusuario documentado no comentario de epigrafe da migration.';



COMMENT ON COLUMN "public"."programs"."legacy_id" IS 'Id textual atual (prog-1, prog-<ts>) preservado para URLs e migracao do db.json.';



COMMENT ON COLUMN "public"."programs"."standard_structure" IS 'Lista de strings da estrutura padrao. text[] nativo em vez de jsonb: nunca e consultada por elemento.';



COMMENT ON COLUMN "public"."programs"."standard_segments" IS 'Template Segment[] do programa (com questions[] aninhado). Nunca referenciado por FK - vira questions reais so quando vira episodio.';



CREATE TABLE IF NOT EXISTS "public"."question_follow_ups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "question_id" "uuid" NOT NULL,
    "order_pos" integer DEFAULT 0 NOT NULL,
    "trigger_condition" "text",
    "condition" "text",
    "action_or_question" "text",
    "action" "text",
    "camera_cue" "text",
    "target_participant" "text",
    "tag" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "question_follow_ups_order_pos_check" CHECK (("order_pos" >= 0))
);


ALTER TABLE "public"."question_follow_ups" OWNER TO "postgres";


COMMENT ON COLUMN "public"."question_follow_ups"."tag" IS 'Em text SEM CHECK: /api/ai/repiques devolve tag e parseAIJson nao valida. CHECK transformaria resposta de LLM fora do union em falha de insert.';



CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "episode_id" "uuid" NOT NULL,
    "segment_id" "uuid",
    "participant_id" "uuid",
    "target_participant_name" "text",
    "order_pos" integer DEFAULT 0 NOT NULL,
    "speaker" "text",
    "text" "text" NOT NULL,
    "objective" "text",
    "suggested_camera" "text",
    "recommended_camera" "text",
    "eye_direction" "text",
    "status" "text",
    "block_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "questions_order_pos_check" CHECK (("order_pos" >= 0))
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."questions" IS 'QuestionItem. SET NULL em segment_id por fidelidade ao modelo atual: questions[] e segments[] sao arrays independentes, e apagar um segmento hoje NAO apaga a pergunta - so deixa o segmentId pendurado. SET NULL troca o penduramento por integridade sem criar exclusao nova.';



CREATE TABLE IF NOT EXISTS "public"."recording_markers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "episode_id" "uuid" NOT NULL,
    "timestamp_sec" integer NOT NULL,
    "formatted_time" "text" NOT NULL,
    "type" "text" NOT NULL,
    "block_title" "text" NOT NULL,
    "reference_text" "text" NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recording_markers_timestamp_sec_check" CHECK (("timestamp_sec" >= 0)),
    CONSTRAINT "recording_markers_type_check" CHECK (("type" = ANY (ARRAY['momento_forte'::"text", 'corte'::"text", 'nota'::"text", 'estender'::"text", 'erro'::"text"])))
);


ALTER TABLE "public"."recording_markers" OWNER TO "postgres";


COMMENT ON TABLE "public"."recording_markers" IS 'Marcadores ao vivo. block_title NAO tem FK: RecordingMarker nao carrega id de segmento, so o titulo desnormalizado. Converter para FK exige decisao do usuario.';



CREATE TABLE IF NOT EXISTS "public"."recording_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "episode_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "scheduled_start" timestamp with time zone,
    "actual_start" timestamp with time zone,
    "actual_end" timestamp with time zone,
    "location" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recording_sessions_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'setup'::"text", 'rehearsal'::"text", 'recording'::"text", 'paused'::"text", 'finished'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."recording_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."script_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "episode_id" "uuid" NOT NULL,
    "segment_id" "uuid",
    "question_id" "uuid",
    "order_pos" integer DEFAULT 0 NOT NULL,
    "timestamp" "text",
    "type" "text",
    "camera" "text",
    "camera_instruction" "text",
    "alternative_camera" "text",
    "speaker" "text" NOT NULL,
    "target_person" "text",
    "eye_direction" "text",
    "shot_type" "text",
    "content" "text",
    "teleprompter_text" "text",
    "directional_markers" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_teleprompter" boolean DEFAULT false NOT NULL,
    "estimated_duration_seconds" integer,
    "notes" "text",
    "transition" "text",
    "block_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "script_items_estimated_duration_seconds_check" CHECK (("estimated_duration_seconds" >= 0)),
    CONSTRAINT "script_items_order_pos_check" CHECK (("order_pos" >= 0))
);


ALTER TABLE "public"."script_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."script_items" IS 'ScriptItem em ordem cronologica. timestamp e text (valores "00:00", "05:15", "11:15") porque o modelo nao tem semantica de duracao - nao converter para interval sem decisao do usuario.';



COMMENT ON COLUMN "public"."script_items"."type" IS 'Em text SEM CHECK: /api/ai/script gera estes valores e parseAIJson nao valida.';



CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "number" integer NOT NULL,
    "title" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "target_episodes_count" integer DEFAULT 0 NOT NULL,
    "executive_producer" "text" DEFAULT ''::"text" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "seasons_number_check" CHECK (("number" > 0)),
    CONSTRAINT "seasons_status_check" CHECK (("status" = ANY (ARRAY['planning'::"text", 'active'::"text", 'closed'::"text"]))),
    CONSTRAINT "seasons_target_episodes_count_check" CHECK (("target_episodes_count" >= 0))
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."segment_participants" (
    "segment_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "order_pos" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."segment_participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."segment_participants" IS 'Elenco do quadro (Segment.participantIds[]). Puramente derivado, sem identidade propria: CASCADE nos dois lados. CUIDADO na fase 2: o participante precisa existir em participants ANTES desta insercao, senao a FK rejeita o save.';



CREATE TABLE IF NOT EXISTS "public"."segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_id" "text",
    "episode_id" "uuid" NOT NULL,
    "order_pos" integer DEFAULT 0 NOT NULL,
    "block_number" integer,
    "title" "text" NOT NULL,
    "type" "text",
    "estimated_duration_min" integer,
    "estimated_duration_minutes" integer,
    "description" "text",
    "key_themes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "suggested_camera_id" "uuid",
    "primary_camera" "text",
    "transition_text" "text",
    "b_roll_notes" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "planned_start_sec" integer,
    "actual_start_sec" integer,
    "actual_duration_min" integer,
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    CONSTRAINT "segments_actual_duration_min_check" CHECK ((("actual_duration_min" IS NULL) OR ("actual_duration_min" >= 0))),
    CONSTRAINT "segments_actual_start_sec_check" CHECK ((("actual_start_sec" IS NULL) OR ("actual_start_sec" >= 0))),
    CONSTRAINT "segments_estimated_duration_min_check" CHECK (("estimated_duration_min" >= 0)),
    CONSTRAINT "segments_estimated_duration_minutes_check" CHECK (("estimated_duration_minutes" >= 0)),
    CONSTRAINT "segments_order_pos_check" CHECK (("order_pos" >= 0)),
    CONSTRAINT "segments_planned_start_sec_check" CHECK ((("planned_start_sec" IS NULL) OR ("planned_start_sec" >= 0))),
    CONSTRAINT "segments_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'ready'::"text", 'recording'::"text", 'recorded'::"text", 'cut'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."segments" OWNER TO "postgres";


COMMENT ON TABLE "public"."segments" IS 'Segment/OutlineBlock. Segment.questions[] NAO e coluna: e projecao de questions WHERE segment_id = este.id.';



COMMENT ON COLUMN "public"."segments"."order_pos" IS 'Campo TS `order` (palavra reservada em SQL).';



COMMENT ON COLUMN "public"."segments"."type" IS 'SegmentType em text SEM CHECK: /api/ai/outline gera estes valores e parseAIJson nao valida.';



ALTER TABLE ONLY "public"."agenda_events"
    ADD CONSTRAINT "agenda_events_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."agenda_events"
    ADD CONSTRAINT "agenda_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_generations"
    ADD CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_folders"
    ADD CONSTRAINT "asset_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_tags"
    ADD CONSTRAINT "asset_tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."asset_tags"
    ADD CONSTRAINT "asset_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cameras"
    ADD CONSTRAINT "cameras_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."cameras"
    ADD CONSTRAINT "cameras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commercial_plans"
    ADD CONSTRAINT "commercial_plans_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."commercial_plans"
    ADD CONSTRAINT "commercial_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crew_members"
    ADD CONSTRAINT "crew_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."episode_crew"
    ADD CONSTRAINT "episode_crew_episode_id_crew_member_id_key" UNIQUE ("episode_id", "crew_member_id");



ALTER TABLE ONLY "public"."episode_crew"
    ADD CONSTRAINT "episode_crew_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."episode_participants"
    ADD CONSTRAINT "episode_participants_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."episode_participants"
    ADD CONSTRAINT "episode_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."episode_versions"
    ADD CONSTRAINT "episode_versions_episode_id_version_key" UNIQUE ("episode_id", "version");



ALTER TABLE ONLY "public"."episode_versions"
    ADD CONSTRAINT "episode_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."episodes"
    ADD CONSTRAINT "episodes_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."episodes"
    ADD CONSTRAINT "episodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."library_assets"
    ADD CONSTRAINT "library_assets_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."library_assets"
    ADD CONSTRAINT "library_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_programs"
    ADD CONSTRAINT "organization_programs_pkey" PRIMARY KEY ("organization_id", "catalog_program_id");



ALTER TABLE ONLY "public"."organization_subscriptions"
    ADD CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_programs"
    ADD CONSTRAINT "plan_programs_pkey" PRIMARY KEY ("plan_id", "catalog_program_id");



ALTER TABLE ONLY "public"."planned_shorts"
    ADD CONSTRAINT "planned_shorts_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."planned_shorts"
    ADD CONSTRAINT "planned_shorts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."postproduction_jobs"
    ADD CONSTRAINT "postproduction_jobs_episode_id_stage_key" UNIQUE ("episode_id", "stage");



ALTER TABLE ONLY "public"."postproduction_jobs"
    ADD CONSTRAINT "postproduction_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_assets"
    ADD CONSTRAINT "production_assets_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."production_assets"
    ADD CONSTRAINT "production_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_catalog"
    ADD CONSTRAINT "program_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_catalog"
    ADD CONSTRAINT "program_catalog_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."program_crew"
    ADD CONSTRAINT "program_crew_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_crew"
    ADD CONSTRAINT "program_crew_program_id_crew_member_id_key" UNIQUE ("program_id", "crew_member_id");



ALTER TABLE ONLY "public"."program_user_access"
    ADD CONSTRAINT "program_user_access_pkey" PRIMARY KEY ("user_id", "catalog_program_id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_follow_ups"
    ADD CONSTRAINT "question_follow_ups_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."question_follow_ups"
    ADD CONSTRAINT "question_follow_ups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recording_markers"
    ADD CONSTRAINT "recording_markers_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."recording_markers"
    ADD CONSTRAINT "recording_markers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recording_sessions"
    ADD CONSTRAINT "recording_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."script_items"
    ADD CONSTRAINT "script_items_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."script_items"
    ADD CONSTRAINT "script_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_program_id_number_key" UNIQUE ("program_id", "number");



ALTER TABLE ONLY "public"."segment_participants"
    ADD CONSTRAINT "segment_participants_pkey" PRIMARY KEY ("segment_id", "participant_id");



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_legacy_id_key" UNIQUE ("legacy_id");



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_pkey" PRIMARY KEY ("id");



CREATE INDEX "agenda_events_episode_idx" ON "public"."agenda_events" USING "btree" ("episode_id");



CREATE INDEX "agenda_events_program_idx" ON "public"."agenda_events" USING "btree" ("program_id");



CREATE INDEX "agenda_events_scheduled_idx" ON "public"."agenda_events" USING "btree" ("scheduled_date", "scheduled_time");



COMMENT ON INDEX "public"."agenda_events_scheduled_idx" IS 'DashboardView.tsx:48 ordena por data e AgendaView.tsx lista a agenda por data.';



CREATE INDEX "ai_generations_applied_by_idx" ON "public"."ai_generations" USING "btree" ("applied_by");



CREATE INDEX "ai_generations_created_by_idx" ON "public"."ai_generations" USING "btree" ("created_by");



CREATE INDEX "ai_generations_episode_idx" ON "public"."ai_generations" USING "btree" ("episode_id");



CREATE INDEX "ai_generations_org_idx" ON "public"."ai_generations" USING "btree" ("organization_id");



CREATE INDEX "ai_generations_program_idx" ON "public"."ai_generations" USING "btree" ("program_id");



CREATE INDEX "audit_log_actor_idx" ON "public"."audit_log" USING "btree" ("actor_user_id");



CREATE INDEX "audit_log_episode_idx" ON "public"."audit_log" USING "btree" ("episode_id");



CREATE INDEX "audit_log_org_created_idx" ON "public"."audit_log" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "cameras_program_sort_idx" ON "public"."cameras" USING "btree" ("program_id", "sort_order");



CREATE INDEX "crew_org_idx" ON "public"."crew_members" USING "btree" ("organization_id");



CREATE INDEX "episode_crew_crew_idx" ON "public"."episode_crew" USING "btree" ("crew_member_id");



CREATE INDEX "episode_crew_episode_idx" ON "public"."episode_crew" USING "btree" ("episode_id");



CREATE INDEX "episode_participants_entry_segment_idx" ON "public"."episode_participants" USING "btree" ("entry_segment_id");



CREATE INDEX "episode_participants_episode_order_idx" ON "public"."episode_participants" USING "btree" ("episode_id", "order_pos");



CREATE INDEX "episode_participants_exit_segment_idx" ON "public"."episode_participants" USING "btree" ("exit_segment_id");



CREATE INDEX "episode_participants_participant_idx" ON "public"."episode_participants" USING "btree" ("participant_id");



CREATE INDEX "episode_versions_changed_by_idx" ON "public"."episode_versions" USING "btree" ("changed_by");



CREATE INDEX "episode_versions_episode_idx" ON "public"."episode_versions" USING "btree" ("episode_id");



CREATE INDEX "episodes_created_at_idx" ON "public"."episodes" USING "btree" ("created_at" DESC);



COMMENT ON INDEX "public"."episodes_created_at_idx" IS 'db.saveEpisode() faz unshift - a lista e mais-novo-primeiro.';



CREATE INDEX "episodes_guest_id_idx" ON "public"."episodes" USING "btree" ("guest_id");



CREATE INDEX "episodes_production_status_idx" ON "public"."episodes" USING "btree" ("production_status");



CREATE INDEX "episodes_program_idx" ON "public"."episodes" USING "btree" ("program_id");



CREATE INDEX "episodes_season_idx" ON "public"."episodes" USING "btree" ("season_id");



CREATE INDEX "episodes_status_idx" ON "public"."episodes" USING "btree" ("status");



COMMENT ON INDEX "public"."episodes_status_idx" IS 'EpisodesListView.tsx:37 filtra por status; DashboardView.tsx:30 busca o proximo por status.';



CREATE INDEX "idx_asset_folders_episode" ON "public"."asset_folders" USING "btree" ("episode_id");



CREATE INDEX "idx_asset_folders_parent" ON "public"."asset_folders" USING "btree" ("parent_id");



CREATE INDEX "idx_asset_folders_program" ON "public"."asset_folders" USING "btree" ("program_id");



CREATE INDEX "idx_asset_tags_episode" ON "public"."asset_tags" USING "btree" ("episode_id");



CREATE INDEX "idx_asset_tags_program" ON "public"."asset_tags" USING "btree" ("program_id");



CREATE INDEX "idx_org_programs_org" ON "public"."organization_programs" USING "btree" ("organization_id");



CREATE INDEX "idx_org_subscriptions_org" ON "public"."organization_subscriptions" USING "btree" ("organization_id");



CREATE INDEX "library_assets_org_idx" ON "public"."library_assets" USING "btree" ("organization_id");



CREATE INDEX "library_assets_program_idx" ON "public"."library_assets" USING "btree" ("program_id");



CREATE INDEX "organization_members_org_idx" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "organization_members_user_idx" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "participants_program_idx" ON "public"."participants" USING "btree" ("program_id");



CREATE INDEX "planned_shorts_episode_idx" ON "public"."planned_shorts" USING "btree" ("episode_id");



CREATE INDEX "planned_shorts_segment_idx" ON "public"."planned_shorts" USING "btree" ("segment_id");



CREATE INDEX "postproduction_jobs_crew_idx" ON "public"."postproduction_jobs" USING "btree" ("assigned_crew_member_id");



CREATE INDEX "postproduction_jobs_episode_idx" ON "public"."postproduction_jobs" USING "btree" ("episode_id");



CREATE INDEX "production_assets_episode_idx" ON "public"."production_assets" USING "btree" ("episode_id");



CREATE INDEX "production_assets_segment_idx" ON "public"."production_assets" USING "btree" ("segment_id");



CREATE INDEX "production_tasks_created_by_idx" ON "public"."production_tasks" USING "btree" ("created_by");



CREATE INDEX "production_tasks_crew_idx" ON "public"."production_tasks" USING "btree" ("assigned_crew_member_id");



CREATE INDEX "production_tasks_episode_idx" ON "public"."production_tasks" USING "btree" ("episode_id");



CREATE INDEX "production_tasks_org_idx" ON "public"."production_tasks" USING "btree" ("organization_id");



CREATE INDEX "production_tasks_program_idx" ON "public"."production_tasks" USING "btree" ("program_id");



CREATE INDEX "program_crew_crew_idx" ON "public"."program_crew" USING "btree" ("crew_member_id");



CREATE INDEX "program_crew_program_idx" ON "public"."program_crew" USING "btree" ("program_id");



CREATE INDEX "programs_org_idx" ON "public"."programs" USING "btree" ("organization_id");



CREATE INDEX "question_follow_ups_question_order_idx" ON "public"."question_follow_ups" USING "btree" ("question_id", "order_pos");



CREATE INDEX "questions_episode_order_idx" ON "public"."questions" USING "btree" ("episode_id", "order_pos");



CREATE INDEX "questions_participant_idx" ON "public"."questions" USING "btree" ("participant_id");



CREATE INDEX "questions_segment_idx" ON "public"."questions" USING "btree" ("segment_id");



COMMENT ON INDEX "public"."questions_segment_idx" IS 'GANHO DA NORMALIZACAO: EpisodeScriptWorkspace.tsx:68 cria pergunta com segmentId e o OutlineTab renderiza por quadro. Com Episode num JSONB unico isso e varredura em memoria; aqui e lookup indexado.';



CREATE INDEX "recording_markers_episode_time_idx" ON "public"."recording_markers" USING "btree" ("episode_id", "timestamp_sec");



COMMENT ON INDEX "public"."recording_markers_episode_time_idx" IS '/api/ai/editor-script consome os marcadores em ordem cronologica.';



CREATE INDEX "recording_sessions_created_by_idx" ON "public"."recording_sessions" USING "btree" ("created_by");



CREATE INDEX "recording_sessions_episode_idx" ON "public"."recording_sessions" USING "btree" ("episode_id");



CREATE INDEX "script_items_episode_order_idx" ON "public"."script_items" USING "btree" ("episode_id", "order_pos");



CREATE INDEX "script_items_question_idx" ON "public"."script_items" USING "btree" ("question_id");



COMMENT ON INDEX "public"."script_items_question_idx" IS 'GANHO DA NORMALIZACAO: ScriptTab.tsx:235 e StudioModeModal.tsx:128 fazem questions.find(q => q.id === item.questionRefId). Com FK+indice isso vira lookup; num Episode JSONB vira varredura de todo o roteiro.';



CREATE INDEX "script_items_segment_idx" ON "public"."script_items" USING "btree" ("segment_id");



CREATE INDEX "seasons_program_idx" ON "public"."seasons" USING "btree" ("program_id");



CREATE INDEX "segment_participants_participant_idx" ON "public"."segment_participants" USING "btree" ("participant_id");



CREATE INDEX "segments_episode_order_idx" ON "public"."segments" USING "btree" ("episode_id", "order_pos");



CREATE INDEX "segments_suggested_camera_idx" ON "public"."segments" USING "btree" ("suggested_camera_id");



CREATE OR REPLACE TRIGGER "agenda_events_set_updated_at" BEFORE UPDATE ON "public"."agenda_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "cameras_set_updated_at" BEFORE UPDATE ON "public"."cameras" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "episode_participants_set_updated_at" BEFORE UPDATE ON "public"."episode_participants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "episodes_set_updated_at" BEFORE UPDATE ON "public"."episodes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "library_assets_set_updated_at" BEFORE UPDATE ON "public"."library_assets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "participants_set_updated_at" BEFORE UPDATE ON "public"."participants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "planned_shorts_set_updated_at" BEFORE UPDATE ON "public"."planned_shorts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "production_assets_set_updated_at" BEFORE UPDATE ON "public"."production_assets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "programs_set_updated_at" BEFORE UPDATE ON "public"."programs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "question_follow_ups_set_updated_at" BEFORE UPDATE ON "public"."question_follow_ups" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "questions_set_updated_at" BEFORE UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "recording_markers_set_updated_at" BEFORE UPDATE ON "public"."recording_markers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "script_items_set_updated_at" BEFORE UPDATE ON "public"."script_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "segments_set_updated_at" BEFORE UPDATE ON "public"."segments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."agenda_events"
    ADD CONSTRAINT "agenda_events_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agenda_events"
    ADD CONSTRAINT "agenda_events_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_generations"
    ADD CONSTRAINT "ai_generations_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_generations"
    ADD CONSTRAINT "ai_generations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_generations"
    ADD CONSTRAINT "ai_generations_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_generations"
    ADD CONSTRAINT "ai_generations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_generations"
    ADD CONSTRAINT "ai_generations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_folders"
    ADD CONSTRAINT "asset_folders_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_folders"
    ADD CONSTRAINT "asset_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."asset_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."asset_folders"
    ADD CONSTRAINT "asset_folders_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_tags"
    ADD CONSTRAINT "asset_tags_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_tags"
    ADD CONSTRAINT "asset_tags_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cameras"
    ADD CONSTRAINT "cameras_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crew_members"
    ADD CONSTRAINT "crew_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."episode_crew"
    ADD CONSTRAINT "episode_crew_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "public"."crew_members"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."episode_crew"
    ADD CONSTRAINT "episode_crew_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."episode_participants"
    ADD CONSTRAINT "episode_participants_entry_segment_id_fkey" FOREIGN KEY ("entry_segment_id") REFERENCES "public"."segments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."episode_participants"
    ADD CONSTRAINT "episode_participants_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."episode_participants"
    ADD CONSTRAINT "episode_participants_exit_segment_id_fkey" FOREIGN KEY ("exit_segment_id") REFERENCES "public"."segments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."episode_participants"
    ADD CONSTRAINT "episode_participants_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."episode_versions"
    ADD CONSTRAINT "episode_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."episode_versions"
    ADD CONSTRAINT "episode_versions_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."episodes"
    ADD CONSTRAINT "episodes_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."participants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."episodes"
    ADD CONSTRAINT "episodes_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."episodes"
    ADD CONSTRAINT "episodes_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."library_assets"
    ADD CONSTRAINT "library_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."library_assets"
    ADD CONSTRAINT "library_assets_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_programs"
    ADD CONSTRAINT "organization_programs_catalog_program_id_fkey" FOREIGN KEY ("catalog_program_id") REFERENCES "public"."program_catalog"("id");



ALTER TABLE ONLY "public"."organization_programs"
    ADD CONSTRAINT "organization_programs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_programs"
    ADD CONSTRAINT "organization_programs_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_programs"
    ADD CONSTRAINT "organization_programs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."organization_subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_subscriptions"
    ADD CONSTRAINT "organization_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_subscriptions"
    ADD CONSTRAINT "organization_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."commercial_plans"("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_programs"
    ADD CONSTRAINT "plan_programs_catalog_program_id_fkey" FOREIGN KEY ("catalog_program_id") REFERENCES "public"."program_catalog"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_programs"
    ADD CONSTRAINT "plan_programs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."commercial_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planned_shorts"
    ADD CONSTRAINT "planned_shorts_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planned_shorts"
    ADD CONSTRAINT "planned_shorts_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."postproduction_jobs"
    ADD CONSTRAINT "postproduction_jobs_assigned_crew_member_id_fkey" FOREIGN KEY ("assigned_crew_member_id") REFERENCES "public"."crew_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."postproduction_jobs"
    ADD CONSTRAINT "postproduction_jobs_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_assets"
    ADD CONSTRAINT "production_assets_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_assets"
    ADD CONSTRAINT "production_assets_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_assigned_crew_member_id_fkey" FOREIGN KEY ("assigned_crew_member_id") REFERENCES "public"."crew_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_crew"
    ADD CONSTRAINT "program_crew_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "public"."crew_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_crew"
    ADD CONSTRAINT "program_crew_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_user_access"
    ADD CONSTRAINT "program_user_access_catalog_program_id_fkey" FOREIGN KEY ("catalog_program_id") REFERENCES "public"."program_catalog"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_user_access"
    ADD CONSTRAINT "program_user_access_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_user_access"
    ADD CONSTRAINT "program_user_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_catalog_program_id_fkey" FOREIGN KEY ("catalog_program_id") REFERENCES "public"."program_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_follow_ups"
    ADD CONSTRAINT "question_follow_ups_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recording_markers"
    ADD CONSTRAINT "recording_markers_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recording_sessions"
    ADD CONSTRAINT "recording_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recording_sessions"
    ADD CONSTRAINT "recording_sessions_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."script_items"
    ADD CONSTRAINT "script_items_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."script_items"
    ADD CONSTRAINT "script_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."script_items"
    ADD CONSTRAINT "script_items_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."segment_participants"
    ADD CONSTRAINT "segment_participants_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."segment_participants"
    ADD CONSTRAINT "segment_participants_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_suggested_camera_id_fkey" FOREIGN KEY ("suggested_camera_id") REFERENCES "public"."cameras"("id") ON DELETE SET NULL;



ALTER TABLE "public"."agenda_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_access" ON "public"."ai_generations" TO "authenticated" USING ("tm_private"."is_org_member"("organization_id")) WITH CHECK ("tm_private"."is_org_member"("organization_id"));



ALTER TABLE "public"."ai_generations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."asset_folders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "asset_folders_org_access" ON "public"."asset_folders" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "asset_folders"."program_id") AND "tm_private"."is_org_member"("p"."organization_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "asset_folders"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "asset_folders"."program_id") AND "tm_private"."is_org_member"("p"."organization_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "asset_folders"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))));



ALTER TABLE "public"."asset_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "asset_tags_org_access" ON "public"."asset_tags" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "asset_tags"."program_id") AND "tm_private"."is_org_member"("p"."organization_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "asset_tags"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "asset_tags"."program_id") AND "tm_private"."is_org_member"("p"."organization_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "asset_tags"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_select" ON "public"."audit_log" FOR SELECT TO "authenticated" USING ("tm_private"."is_org_member"("organization_id"));



ALTER TABLE "public"."cameras" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "catalog_public_select" ON "public"."program_catalog" FOR SELECT TO "authenticated", "anon" USING ((("active" = true) AND ("contractable" = true)));



ALTER TABLE "public"."commercial_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crew_access" ON "public"."crew_members" TO "authenticated" USING ("tm_private"."is_org_member"("organization_id")) WITH CHECK ("tm_private"."is_org_member"("organization_id"));



ALTER TABLE "public"."crew_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."episode_crew" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "episode_crew_access" ON "public"."episode_crew" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "episode_crew"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "episode_crew"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



ALTER TABLE "public"."episode_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."episode_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."episodes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "episodes_access_select" ON "public"."episodes" FOR SELECT TO "authenticated" USING ("public"."has_program_access"("program_id"));



ALTER TABLE "public"."library_assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_member_manage" ON "public"."organization_members" TO "authenticated" USING ("tm_private"."is_org_role"("organization_id", ARRAY['owner'::"text", 'admin'::"text"])) WITH CHECK ("tm_private"."is_org_role"("organization_id", ARRAY['owner'::"text", 'admin'::"text"]));



CREATE POLICY "org_member_select" ON "public"."organization_members" FOR SELECT TO "authenticated" USING ("tm_private"."is_org_member"("organization_id"));



CREATE POLICY "org_programs_access" ON "public"."organization_programs" TO "authenticated" USING ("tm_private"."is_org_member"("organization_id")) WITH CHECK ("tm_private"."is_org_role"("organization_id", ARRAY['owner'::"text", 'admin'::"text"]));



CREATE POLICY "org_select" ON "public"."organizations" FOR SELECT TO "authenticated" USING ("tm_private"."is_org_member"("id"));



CREATE POLICY "org_subscriptions_access" ON "public"."organization_subscriptions" TO "authenticated" USING ("tm_private"."is_org_member"("organization_id")) WITH CHECK ("tm_private"."is_org_role"("organization_id", ARRAY['owner'::"text", 'admin'::"text"]));



CREATE POLICY "org_update" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ("tm_private"."is_org_role"("id", ARRAY['owner'::"text", 'admin'::"text"])) WITH CHECK ("tm_private"."is_org_role"("id", ARRAY['owner'::"text", 'admin'::"text"]));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_programs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "participants_access_select" ON "public"."participants" FOR SELECT TO "authenticated" USING ("public"."has_program_access"("program_id"));



ALTER TABLE "public"."plan_programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plan_programs_public_select" ON "public"."plan_programs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."commercial_plans" "p"
  WHERE (("p"."id" = "plan_programs"."plan_id") AND ("p"."active" = true)))));



ALTER TABLE "public"."planned_shorts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plans_public_select" ON "public"."commercial_plans" FOR SELECT TO "authenticated" USING (("active" = true));



CREATE POLICY "postproduction_access" ON "public"."postproduction_jobs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "postproduction_jobs"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "postproduction_jobs"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



ALTER TABLE "public"."postproduction_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."production_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."production_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."program_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."program_crew" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "program_crew_access" ON "public"."program_crew" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "program_crew"."program_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "program_crew"."program_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



ALTER TABLE "public"."program_user_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "program_user_access_select_org_admin" ON "public"."program_user_access" FOR SELECT TO "authenticated" USING ("tm_private"."is_org_role"("organization_id", ARRAY['owner'::"text", 'admin'::"text"]));



CREATE POLICY "program_user_access_select_own" ON "public"."program_user_access" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "programs_access_select" ON "public"."programs" FOR SELECT TO "authenticated" USING ("public"."has_program_access"("id"));



CREATE POLICY "programs_delete" ON "public"."programs" FOR DELETE TO "authenticated" USING ("tm_private"."is_org_role"("organization_id", ARRAY['owner'::"text", 'admin'::"text"]));



CREATE POLICY "programs_insert" ON "public"."programs" FOR INSERT TO "authenticated" WITH CHECK ("tm_private"."is_org_role"("organization_id", ARRAY['owner'::"text", 'admin'::"text"]));



CREATE POLICY "programs_select" ON "public"."programs" FOR SELECT TO "authenticated" USING ("tm_private"."is_org_member"("organization_id"));



CREATE POLICY "programs_update" ON "public"."programs" FOR UPDATE TO "authenticated" USING ("tm_private"."is_org_role"("organization_id", ARRAY['owner'::"text", 'admin'::"text"])) WITH CHECK ("tm_private"."is_org_role"("organization_id", ARRAY['owner'::"text", 'admin'::"text"]));



ALTER TABLE "public"."question_follow_ups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recording_access" ON "public"."recording_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "recording_sessions"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "recording_sessions"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



ALTER TABLE "public"."recording_markers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recording_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."script_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seasons_access" ON "public"."seasons" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "seasons"."program_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "seasons"."program_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



ALTER TABLE "public"."segment_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."segments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_access" ON "public"."production_tasks" TO "authenticated" USING ("tm_private"."is_org_member"("organization_id")) WITH CHECK ("tm_private"."is_org_member"("organization_id"));



CREATE POLICY "tm_org_access" ON "public"."agenda_events" TO "authenticated" USING ((("program_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "agenda_events"."program_id") AND "tm_private"."is_org_member"("p"."organization_id")))))) WITH CHECK ((("program_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "agenda_events"."program_id") AND "tm_private"."is_org_member"("p"."organization_id"))))));



CREATE POLICY "tm_org_access" ON "public"."cameras" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "cameras"."program_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "cameras"."program_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."episode_participants" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "episode_participants"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "episode_participants"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."episodes" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "episodes"."program_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "episodes"."program_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."library_assets" TO "authenticated" USING ("tm_private"."is_org_member"("organization_id")) WITH CHECK ("tm_private"."is_org_member"("organization_id"));



CREATE POLICY "tm_org_access" ON "public"."participants" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "participants"."program_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."programs" "p"
  WHERE (("p"."id" = "participants"."program_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."planned_shorts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "planned_shorts"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "planned_shorts"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."production_assets" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "production_assets"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "production_assets"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."question_follow_ups" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."questions" "q"
     JOIN "public"."episodes" "e" ON (("e"."id" = "q"."episode_id")))
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("q"."id" = "question_follow_ups"."question_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."questions" "q"
     JOIN "public"."episodes" "e" ON (("e"."id" = "q"."episode_id")))
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("q"."id" = "question_follow_ups"."question_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."questions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "questions"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "questions"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."recording_markers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "recording_markers"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "recording_markers"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."script_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "script_items"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "script_items"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."segment_participants" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."segments" "s"
     JOIN "public"."episodes" "e" ON (("e"."id" = "s"."episode_id")))
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("s"."id" = "segment_participants"."segment_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."segments" "s"
     JOIN "public"."episodes" "e" ON (("e"."id" = "s"."episode_id")))
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("s"."id" = "segment_participants"."segment_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "tm_org_access" ON "public"."segments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "segments"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "segments"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



CREATE POLICY "version_access" ON "public"."episode_versions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "episode_versions"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."episodes" "e"
     JOIN "public"."programs" "p" ON (("p"."id" = "e"."program_id")))
  WHERE (("e"."id" = "episode_versions"."episode_id") AND "tm_private"."is_org_member"("p"."organization_id")))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_program_access"("p_program_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_program_access"("p_program_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_org_member"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_org_member"("p_organization_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_episode"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_episode"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_episode"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_program"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_program"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_program"("p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tm_delete_missing"("p_table" "text", "p_parent_col" "text", "p_parent_id" "uuid", "p_keep" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tm_delete_missing"("p_table" "text", "p_parent_col" "text", "p_parent_id" "uuid", "p_keep" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tm_delete_missing"("p_table" "text", "p_parent_col" "text", "p_parent_id" "uuid", "p_keep" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."tm_row_upsert"("p_table" "text", "p_rows" "jsonb", "p_conflict" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tm_row_upsert"("p_table" "text", "p_rows" "jsonb", "p_conflict" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tm_row_upsert"("p_table" "text", "p_rows" "jsonb", "p_conflict" "text"[]) TO "service_role";



GRANT ALL ON TABLE "public"."agenda_events" TO "anon";
GRANT ALL ON TABLE "public"."agenda_events" TO "authenticated";
GRANT ALL ON TABLE "public"."agenda_events" TO "service_role";



GRANT ALL ON TABLE "public"."ai_generations" TO "anon";
GRANT ALL ON TABLE "public"."ai_generations" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_generations" TO "service_role";



GRANT ALL ON TABLE "public"."asset_folders" TO "anon";
GRANT ALL ON TABLE "public"."asset_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_folders" TO "service_role";



GRANT ALL ON TABLE "public"."asset_tags" TO "anon";
GRANT ALL ON TABLE "public"."asset_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_tags" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cameras" TO "anon";
GRANT ALL ON TABLE "public"."cameras" TO "authenticated";
GRANT ALL ON TABLE "public"."cameras" TO "service_role";



GRANT ALL ON TABLE "public"."commercial_plans" TO "anon";
GRANT ALL ON TABLE "public"."commercial_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."commercial_plans" TO "service_role";



GRANT ALL ON TABLE "public"."crew_members" TO "anon";
GRANT ALL ON TABLE "public"."crew_members" TO "authenticated";
GRANT ALL ON TABLE "public"."crew_members" TO "service_role";



GRANT ALL ON TABLE "public"."episode_crew" TO "anon";
GRANT ALL ON TABLE "public"."episode_crew" TO "authenticated";
GRANT ALL ON TABLE "public"."episode_crew" TO "service_role";



GRANT ALL ON TABLE "public"."episode_participants" TO "anon";
GRANT ALL ON TABLE "public"."episode_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."episode_participants" TO "service_role";



GRANT ALL ON TABLE "public"."episode_versions" TO "anon";
GRANT ALL ON TABLE "public"."episode_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."episode_versions" TO "service_role";



GRANT ALL ON TABLE "public"."episodes" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."episodes" TO "authenticated";



GRANT ALL ON TABLE "public"."library_assets" TO "anon";
GRANT ALL ON TABLE "public"."library_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."library_assets" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."organization_members" TO "authenticated";



GRANT ALL ON TABLE "public"."organization_programs" TO "service_role";
GRANT SELECT ON TABLE "public"."organization_programs" TO "authenticated";



GRANT ALL ON TABLE "public"."organization_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."organization_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."organizations" TO "authenticated";



GRANT ALL ON TABLE "public"."participants" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."participants" TO "authenticated";



GRANT ALL ON TABLE "public"."plan_programs" TO "anon";
GRANT ALL ON TABLE "public"."plan_programs" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_programs" TO "service_role";



GRANT ALL ON TABLE "public"."planned_shorts" TO "anon";
GRANT ALL ON TABLE "public"."planned_shorts" TO "authenticated";
GRANT ALL ON TABLE "public"."planned_shorts" TO "service_role";



GRANT ALL ON TABLE "public"."postproduction_jobs" TO "anon";
GRANT ALL ON TABLE "public"."postproduction_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."postproduction_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."production_assets" TO "anon";
GRANT ALL ON TABLE "public"."production_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."production_assets" TO "service_role";



GRANT ALL ON TABLE "public"."production_tasks" TO "anon";
GRANT ALL ON TABLE "public"."production_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."production_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."program_catalog" TO "anon";
GRANT ALL ON TABLE "public"."program_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."program_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."program_crew" TO "anon";
GRANT ALL ON TABLE "public"."program_crew" TO "authenticated";
GRANT ALL ON TABLE "public"."program_crew" TO "service_role";



GRANT ALL ON TABLE "public"."program_user_access" TO "service_role";
GRANT SELECT ON TABLE "public"."program_user_access" TO "authenticated";



GRANT ALL ON TABLE "public"."programs" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."programs" TO "authenticated";



GRANT ALL ON TABLE "public"."question_follow_ups" TO "anon";
GRANT ALL ON TABLE "public"."question_follow_ups" TO "authenticated";
GRANT ALL ON TABLE "public"."question_follow_ups" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."recording_markers" TO "anon";
GRANT ALL ON TABLE "public"."recording_markers" TO "authenticated";
GRANT ALL ON TABLE "public"."recording_markers" TO "service_role";



GRANT ALL ON TABLE "public"."recording_sessions" TO "anon";
GRANT ALL ON TABLE "public"."recording_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."recording_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."script_items" TO "anon";
GRANT ALL ON TABLE "public"."script_items" TO "authenticated";
GRANT ALL ON TABLE "public"."script_items" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."segment_participants" TO "anon";
GRANT ALL ON TABLE "public"."segment_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."segment_participants" TO "service_role";



GRANT ALL ON TABLE "public"."segments" TO "anon";
GRANT ALL ON TABLE "public"."segments" TO "authenticated";
GRANT ALL ON TABLE "public"."segments" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







