-- TakeMaster V2: canonical runtime schema verification.
-- This migration is intentionally non-destructive. It only verifies that a
-- target database already contains the schema used by the runtime.

DO $$
DECLARE
  required_table text;
  required_tables constant text[] := ARRAY[
    'organizations',
    'organization_members',
    'programs',
    'seasons',
    'episodes',
    'participants',
    'agenda_events',
    'library_assets',
    'audit_log',
    'ai_generations',
    'program_user_access',
    'questions',
    'segments',
    'script_items',
    'planned_shorts',
    'recording_markers',
    'episode_versions'
  ];
BEGIN
  FOREACH required_table IN ARRAY required_tables LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION
        'Canonical TakeMaster schema missing required table public.%', required_table;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'programs'
      AND column_name = 'organization_id'
  ) THEN
    RAISE EXCEPTION 'Canonical schema missing public.programs.organization_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'episodes'
      AND column_name IN ('program_id', 'season_id')
    GROUP BY table_schema, table_name
    HAVING count(*) = 2
  ) THEN
    RAISE EXCEPTION 'Canonical schema missing public.episodes program/season links';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('programs', 'episodes', 'participants', 'agenda_events')
      AND c.relrowsecurity
    GROUP BY n.nspname
    HAVING count(*) = 4
  ) THEN
    RAISE EXCEPTION 'Canonical runtime tables do not all have RLS enabled';
  END IF;
END;
$$;

