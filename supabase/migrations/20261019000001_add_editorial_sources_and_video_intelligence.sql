-- TakeMaster-v2: full editorial source catalog + YouTube transcript intelligence.
-- Additive only. Existing catalog/program/episode rows are preserved.
create table if not exists public.program_catalog_sources (
  id uuid primary key default gen_random_uuid(),
  catalog_program_id uuid references public.program_catalog(id) on delete cascade,
  source_type text not null check (source_type in ('official_site','youtube','instagram','tiktok','facebook','other_social','presenter_site','manual')),
  source_url text not null,
  canonical_url text,
  platform_account_id text,
  platform_handle text,
  evidence text,
  http_status integer,
  collected_at timestamptz not null default now(),
  source_published_at timestamptz,
  content_hash text,
  extraction_method text not null default 'http',
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (source_type, source_url)
);

create table if not exists public.program_videos (
  id uuid primary key default gen_random_uuid(),
  catalog_program_id uuid references public.program_catalog(id) on delete set null,
  source_id uuid references public.program_catalog_sources(id) on delete set null,
  provider text not null default 'youtube',
  external_video_id text not null,
  canonical_url text not null,
  channel_id text,
  channel_title text,
  title text not null,
  description text,
  published_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  thumbnail_url text,
  language text,
  transcript_status text not null default 'pending'
    check (transcript_status in ('pending','available','unavailable','restricted','error','manual_review')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_video_id)
);

create table if not exists public.video_transcripts (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.program_videos(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  language text not null,
  transcript_type text not null check (transcript_type in ('manual','automatic','authorized_upload')),
  full_text text not null,
  segments jsonb not null default '[]'::jsonb check (jsonb_typeof(segments) = 'array'),
  source_url text,
  content_hash text not null,
  fetched_at timestamptz not null default now(),
  is_current boolean not null default true,
  status text not null default 'ready' check (status in ('ready','needs_review','superseded')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (video_id, language, content_hash),
  unique (video_id, language, version)
);

create table if not exists public.video_editorial_analyses (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.video_transcripts(id) on delete cascade,
  analysis_version integer not null default 1 check (analysis_version > 0),
  summary text not null,
  topics jsonb not null default '[]'::jsonb check (jsonb_typeof(topics) = 'array'),
  guests jsonb not null default '[]'::jsonb check (jsonb_typeof(guests) = 'array'),
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  claims_to_verify jsonb not null default '[]'::jsonb check (jsonb_typeof(claims_to_verify) = 'array'),
  segments jsonb not null default '[]'::jsonb check (jsonb_typeof(segments) = 'array'),
  calls_to_action jsonb not null default '[]'::jsonb check (jsonb_typeof(calls_to_action) = 'array'),
  model_name text,
  prompt_version text,
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (transcript_id, analysis_version)
);

create index if not exists program_catalog_sources_program_idx on public.program_catalog_sources(catalog_program_id);
create index if not exists program_catalog_sources_type_idx on public.program_catalog_sources(source_type);
create index if not exists program_videos_catalog_program_idx on public.program_videos(catalog_program_id);
create index if not exists program_videos_published_idx on public.program_videos(published_at desc);
create index if not exists program_videos_transcript_status_idx on public.program_videos(transcript_status);
create index if not exists video_transcripts_video_current_idx on public.video_transcripts(video_id, is_current);
create index if not exists video_transcripts_segments_gin_idx on public.video_transcripts using gin(segments);
create index if not exists video_editorial_analyses_topics_gin_idx on public.video_editorial_analyses using gin(topics);
create index if not exists video_editorial_analyses_guests_gin_idx on public.video_editorial_analyses using gin(guests);

alter table public.program_catalog_sources enable row level security;
alter table public.program_videos enable row level security;
alter table public.video_transcripts enable row level security;
alter table public.video_editorial_analyses enable row level security;

comment on table public.program_catalog_sources is 'Proveniência rastreável de páginas oficiais, canais e perfis sociais associados a programas.';
comment on table public.program_videos is 'Inventário idempotente de vídeos públicos associados ao catálogo editorial canônico.';
comment on table public.video_transcripts is 'Texto original de legendas/transcrições versionado, com timestamps e hash de conteúdo.';
comment on table public.video_editorial_analyses is 'Análises derivadas de transcrições; não substituem o texto original e exigem revisão editorial.';
