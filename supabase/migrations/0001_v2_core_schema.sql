-- TakeMaster V2 — Migration 0001: Core Relational Schema (PostgreSQL / Supabase)
-- Hierarchy: User -> Organization -> Show -> Production -> Episode -> Participants / Script Versions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9\-]+$'),
  plan TEXT NOT NULL DEFAULT 'studio_pro' CHECK (plan IN ('starter', 'studio_pro', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Organization Members (Context & RBAC)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'producer' CHECK (role IN ('owner', 'admin', 'producer', 'editor', 'host', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- 4. Shows (Programs & Editorial Catalog)
CREATE TABLE IF NOT EXISTS public.shows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 160),
  description TEXT NOT NULL DEFAULT '',
  host TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'Entrevista',
  default_duration_min INTEGER NOT NULL DEFAULT 45 CHECK (default_duration_min BETWEEN 5 AND 360),
  editorial_style TEXT NOT NULL DEFAULT '',
  scenario TEXT NOT NULL DEFAULT '',
  cameras JSONB NOT NULL DEFAULT '[]'::jsonb,
  standard_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_opening TEXT NOT NULL DEFAULT '',
  default_closing TEXT NOT NULL DEFAULT '',
  catalog_status TEXT NOT NULL DEFAULT 'active' CHECK (catalog_status IN ('development', 'active', 'hiatus', 'archived')),
  category TEXT NOT NULL DEFAULT 'Negócios & Liderança',
  target_audience TEXT NOT NULL DEFAULT '',
  distribution_channels JSONB NOT NULL DEFAULT '["YouTube", "Spotify", "Reels/Shorts"]'::jsonb,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Show Members (Program-level isolation when restricted)
CREATE TABLE IF NOT EXISTS public.show_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  show_id TEXT NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'producer' CHECK (role IN ('lead_producer', 'director', 'host', 'researcher', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (show_id, user_id)
);

-- 6. Productions (Seasons / Production Fronts linking Show -> Episode)
CREATE TABLE IF NOT EXISTS public.productions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  show_id TEXT NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 160),
  season_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_production' CHECK (status IN ('planning', 'pre_production', 'in_production', 'post_production', 'completed')),
  target_episodes_count INTEGER NOT NULL DEFAULT 10,
  executive_producer TEXT NOT NULL DEFAULT '',
  start_date TEXT,
  end_date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Participants / Guests (Organization-scoped canonical directory)
CREATE TABLE IF NOT EXISTS public.participants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  role TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  contacts TEXT NOT NULL DEFAULT '',
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  previous_research_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Episodes (Core Editorial & Production Unit)
CREATE TABLE IF NOT EXISTS public.episodes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  show_id TEXT NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  production_id TEXT REFERENCES public.productions(id) ON DELETE SET NULL,
  episode_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 220),
  idea TEXT NOT NULL DEFAULT '',
  guest_name TEXT NOT NULL DEFAULT '',
  guest_id TEXT REFERENCES public.participants(id) ON DELETE SET NULL,
  host TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'Entrevista',
  target_duration_min INTEGER NOT NULL DEFAULT 45 CHECK (target_duration_min BETWEEN 5 AND 360),
  objective TEXT,
  additional_info TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'diagnosis', 'research', 'outline', 'scripting', 'ready', 'recording', 'recorded', 'editing', 'published')),
  diagnosis JSONB NOT NULL DEFAULT '{}'::jsonb,
  research JSONB NOT NULL DEFAULT '{}'::jsonb,
  outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  script JSONB NOT NULL DEFAULT '[]'::jsonb,
  cameras JSONB NOT NULL DEFAULT '[]'::jsonb,
  assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  shorts JSONB NOT NULL DEFAULT '[]'::jsonb,
  recording_markers JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  editor_script_synthesis TEXT,
  recording_time_elapsed INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Episode Participants (N:N relationship Episode <-> Participant)
CREATE TABLE IF NOT EXISTS public.episode_participants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  episode_id TEXT NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  role_in_episode TEXT NOT NULL DEFAULT 'main_guest' CHECK (role_in_episode IN ('main_guest', 'co_guest', 'panelist', 'specialist')),
  confirmation_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (confirmation_status IN ('invited', 'confirmed', 'recorded', 'declined')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (episode_id, participant_id)
);

-- 10. Script Versions (Versioned Snapshots per Episode)
CREATE TABLE IF NOT EXISTS public.script_versions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  episode_id TEXT NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shows_org ON public.shows(organization_id);
CREATE INDEX IF NOT EXISTS idx_productions_show ON public.productions(show_id);
CREATE INDEX IF NOT EXISTS idx_episodes_org_show ON public.episodes(organization_id, show_id);
CREATE INDEX IF NOT EXISTS idx_participants_org ON public.participants(organization_id);
CREATE INDEX IF NOT EXISTS idx_script_versions_ep ON public.script_versions(episode_id);
