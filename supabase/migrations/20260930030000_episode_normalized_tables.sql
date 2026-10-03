-- Episode normalized tables: segments, questions, question_follow_ups, script_items, production_assets, planned_shorts, recording_markers, episode_versions, recording_sessions

create table if not exists public.segments (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  order_pos integer not null check (order_pos >= 0),
  block_number integer,
  title text not null,
  type text,
  estimated_duration_min integer check (estimated_duration_min >= 0),
  estimated_duration_minutes integer check (estimated_duration_minutes >= 0),
  description text,
  key_themes text[] not null default '{}',
  suggested_camera_id uuid references public.cameras(id) on delete set null,
  primary_camera text,
  transition_text text,
  b_roll_notes text,
  notes text,
  planned_start_sec integer check (planned_start_sec >= 0),
  actual_start_sec integer check (actual_start_sec >= 0),
  actual_duration_min integer check (actual_duration_min >= 0),
  status text not null check (status in ('planned','ready','recording','recorded','cut','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists segments_episode_order_idx on public.segments (episode_id, order_pos);
create index if not exists segments_suggested_camera_idx on public.segments (suggested_camera_id);

alter table public.segments enable row level security;
create policy tm_org_access on public.segments for all to authenticated
using (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = segments.episode_id and tm_private.is_org_member(p.organization_id)
)) with check (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = segments.episode_id and tm_private.is_org_member(p.organization_id)
));

create trigger segments_set_updated_at before update on public.segments
for each row execute function set_updated_at();


create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  segment_id uuid references public.segments(id) on delete set null,
  participant_id uuid references public.participants(id) on delete set null,
  target_participant_name text,
  order_pos integer not null check (order_pos >= 0),
  speaker text,
  text text not null,
  objective text,
  suggested_camera text,
  recommended_camera text,
  eye_direction text,
  status text,
  block_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questions_episode_order_idx on public.questions (episode_id, order_pos);
create index if not exists questions_segment_idx on public.questions (segment_id);
create index if not exists questions_participant_idx on public.questions (participant_id);

alter table public.questions enable row level security;
create policy tm_org_access on public.questions for all to authenticated
using (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = questions.episode_id and tm_private.is_org_member(p.organization_id)
)) with check (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = questions.episode_id and tm_private.is_org_member(p.organization_id)
));

create trigger questions_set_updated_at before update on public.questions
for each row execute function set_updated_at();


create table if not exists public.question_follow_ups (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  question_id uuid not null references public.questions(id) on delete cascade,
  order_pos integer not null check (order_pos >= 0),
  trigger_condition text,
  condition text,
  action_or_question text,
  action text,
  camera_cue text,
  target_participant text,
  tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists question_follow_ups_question_order_idx on public.question_follow_ups (question_id, order_pos);

alter table public.question_follow_ups enable row level security;
create policy tm_org_access on public.question_follow_ups for all to authenticated
using (exists (
  select 1 from questions q
  join episodes e on e.id = q.episode_id
  join programs p on p.id = e.program_id
  where q.id = question_follow_ups.question_id and tm_private.is_org_member(p.organization_id)
)) with check (exists (
  select 1 from questions q
  join episodes e on e.id = q.episode_id
  join programs p on p.id = e.program_id
  where q.id = question_follow_ups.question_id and tm_private.is_org_member(p.organization_id)
));

create trigger question_follow_ups_set_updated_at before update on public.question_follow_ups
for each row execute function set_updated_at();


create table if not exists public.script_items (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  segment_id uuid references public.segments(id) on delete set null,
  question_id uuid references public.questions(id) on delete set null,
  order_pos integer not null check (order_pos >= 0),
  timestamp text,
  type text,
  camera text,
  camera_instruction text,
  alternative_camera text,
  speaker text not null,
  target_person text,
  eye_direction text,
  shot_type text,
  content text,
  teleprompter_text text,
  directional_markers text[] not null default '{}',
  is_teleprompter boolean not null default false,
  estimated_duration_seconds integer check (estimated_duration_seconds >= 0),
  notes text,
  transition text,
  block_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists script_items_episode_order_idx on public.script_items (episode_id, order_pos);
create index if not exists script_items_segment_idx on public.script_items (segment_id);
create index if not exists script_items_question_idx on public.script_items (question_id);

alter table public.script_items enable row level security;
create policy tm_org_access on public.script_items for all to authenticated
using (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = script_items.episode_id and tm_private.is_org_member(p.organization_id)
)) with check (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = script_items.episode_id and tm_private.is_org_member(p.organization_id)
));

create trigger script_items_set_updated_at before update on public.script_items
for each row execute function set_updated_at();


create table if not exists public.production_assets (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  segment_id uuid references public.segments(id) on delete set null,
  type text not null,
  title text not null,
  description text,
  content text,
  display_time text,
  moment text,
  status text check (status in ('pendente','em_busca','obtido','aprovado')),
  file_url text,
  notes text,
  block_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists production_assets_episode_idx on public.production_assets (episode_id);
create index if not exists production_assets_segment_idx on public.production_assets (segment_id);

alter table public.production_assets enable row level security;
create policy tm_org_access on public.production_assets for all to authenticated
using (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = production_assets.episode_id and tm_private.is_org_member(p.organization_id)
)) with check (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = production_assets.episode_id and tm_private.is_org_member(p.organization_id)
));

create trigger production_assets_set_updated_at before update on public.production_assets
for each row execute function set_updated_at();


create table if not exists public.planned_shorts (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  segment_id uuid references public.segments(id) on delete set null,
  title text not null,
  hook text,
  suggested_hook text,
  narrative_arc text,
  generating_question text,
  target_participant text,
  estimated_duration text,
  expected_duration_seconds integer check (expected_duration_seconds >= 0),
  camera_focus text,
  b_roll_notes text,
  target_platform text[] not null default '{}',
  status text check (status in ('Planejado','Capturado','Excelente','Não aconteceu')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planned_shorts_episode_idx on public.planned_shorts (episode_id);
create index if not exists planned_shorts_segment_idx on public.planned_shorts (segment_id);

alter table public.planned_shorts enable row level security;
create policy tm_org_access on public.planned_shorts for all to authenticated
using (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = planned_shorts.episode_id and tm_private.is_org_member(p.organization_id)
)) with check (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = planned_shorts.episode_id and tm_private.is_org_member(p.organization_id)
));

create trigger planned_shorts_set_updated_at before update on public.planned_shorts
for each row execute function set_updated_at();


create table if not exists public.recording_markers (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  timestamp_sec integer not null check (timestamp_sec >= 0),
  formatted_time text not null,
  type text not null check (type in ('momento_forte','corte','nota','estender','erro')),
  block_title text not null,
  reference_text text not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recording_markers_episode_time_idx on public.recording_markers (episode_id, timestamp_sec);

alter table public.recording_markers enable row level security;
create policy tm_org_access on public.recording_markers for all to authenticated
using (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = recording_markers.episode_id and tm_private.is_org_member(p.organization_id)
)) with check (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = recording_markers.episode_id and tm_private.is_org_member(p.organization_id)
));

create trigger recording_markers_set_updated_at before update on public.recording_markers
for each row execute function set_updated_at();


create table if not exists public.episode_versions (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  changed_by uuid references auth.users(id) on delete set null,
  change_summary text,
  created_at timestamptz not null default now(),
  unique (episode_id, version)
);

create index if not exists episode_versions_episode_idx on public.episode_versions (episode_id);
create index if not exists episode_versions_changed_by_idx on public.episode_versions (changed_by);

alter table public.episode_versions enable row level security;
create policy version_access on public.episode_versions for all to authenticated
using (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = episode_versions.episode_id and tm_private.is_org_member(p.organization_id)
)) with check (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = episode_versions.episode_id and tm_private.is_org_member(p.organization_id)
));


create table if not exists public.recording_sessions (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  status text not null check (status in ('planned','setup','rehearsal','recording','paused','finished','cancelled')),
  scheduled_start timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  location text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recording_sessions_episode_idx on public.recording_sessions (episode_id);
create index if not exists recording_sessions_created_by_idx on public.recording_sessions (created_by);

alter table public.recording_sessions enable row level security;
create policy recording_access on public.recording_sessions for all to authenticated
using (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = recording_sessions.episode_id and tm_private.is_org_member(p.organization_id)
)) with check (exists (
  select 1 from episodes e
  join programs p on p.id = e.program_id
  where e.id = recording_sessions.episode_id and tm_private.is_org_member(p.organization_id)
));

create trigger recording_sessions_set_updated_at before update on public.recording_sessions
for each row execute function set_updated_at();