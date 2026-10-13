-- TakeMaster V2 — Migration 0002: Operational Workspace (Schedule, Library, Audit) & RLS Policies

-- 11. Schedule Events (Agenda de Produção)
CREATE TABLE IF NOT EXISTS public.schedule_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  show_id TEXT NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  production_id TEXT REFERENCES public.productions(id) ON DELETE SET NULL,
  episode_id TEXT REFERENCES public.episodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  type TEXT NOT NULL DEFAULT 'recording' CHECK (type IN ('pre_interview', 'briefing', 'rehearsal', 'recording', 'editing', 'review', 'release')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  studio_location TEXT NOT NULL DEFAULT 'Estúdio Principal A',
  assigned_team JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Library Assets (Biblioteca Operacional de Assets & B-Roll)
CREATE TABLE IF NOT EXISTS public.library_assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  show_id TEXT REFERENCES public.shows(id) ON DELETE SET NULL,
  episode_id TEXT REFERENCES public.episodes(id) ON DELETE SET NULL,
  block_id TEXT,
  type TEXT NOT NULL DEFAULT 'foto' CHECK (type IN ('foto', 'video', 'documento', 'grafico', 'produto', 'materia', 'trilha', 'vinheta')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description TEXT NOT NULL DEFAULT '',
  moment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_busca', 'obtido', 'aprovado')),
  file_url TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  reusable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Audit Logs (Rastreabilidade de Operação e IA)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_org_show ON public.schedule_events(organization_id, show_id);
CREATE INDEX IF NOT EXISTS idx_library_org_show ON public.library_assets(organization_id, show_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_logs(organization_id, created_at DESC);

-- Row Level Security (RLS) Enablement
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if current authenticated user belongs to organization
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = target_org_id
      AND om.user_id = auth.uid()::text
  );
$$;

-- RLS Policies deriving access strictly from authenticated organization context
CREATE POLICY org_isolation_shows ON public.shows
  FOR ALL USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY org_isolation_productions ON public.productions
  FOR ALL USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY org_isolation_participants ON public.participants
  FOR ALL USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY org_isolation_episodes ON public.episodes
  FOR ALL USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY org_isolation_episode_participants ON public.episode_participants
  FOR ALL USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY org_isolation_script_versions ON public.script_versions
  FOR ALL USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY org_isolation_schedule_events ON public.schedule_events
  FOR ALL USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY org_isolation_library_assets ON public.library_assets
  FOR ALL USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY org_isolation_audit_logs ON public.audit_logs
  FOR SELECT USING (public.is_org_member(organization_id));
