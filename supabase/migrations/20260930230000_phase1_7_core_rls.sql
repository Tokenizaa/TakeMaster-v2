-- V2 Phase 1.7: core Organization/Program authorization for shared Supabase.
-- Applied only after verifying the live schema for project cvyoumtywnyayceoezru.

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.active = true
  );
$$;

create or replace function public.has_program_access(p_program_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.programs p
    where p.id = p_program_id
      and (
        public.is_org_member(p.organization_id)
        or exists (
          select 1
          from public.organization_programs op
          join public.program_user_access pua
            on pua.organization_id = op.organization_id
           and pua.catalog_program_id = op.catalog_program_id
          where op.program_id = p_program_id
            and op.status = 'active'
            and pua.user_id = auth.uid()
            and pua.status = 'active'
        )
      )
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_programs enable row level security;
alter table public.program_user_access enable row level security;
alter table public.programs enable row level security;
alter table public.episodes enable row level security;
alter table public.participants enable row level security;

drop policy if exists programs_access_select on public.programs;
create policy programs_access_select on public.programs for select to authenticated using (public.has_program_access(id));

drop policy if exists episodes_access_select on public.episodes;
create policy episodes_access_select on public.episodes for select to authenticated using (public.has_program_access(program_id));

drop policy if exists participants_access_select on public.participants;
create policy participants_access_select on public.participants for select to authenticated using (public.has_program_access(program_id));

revoke all on table public.organizations, public.organization_members, public.organization_programs, public.program_user_access from anon, authenticated;
revoke all on table public.programs, public.episodes, public.participants from anon, authenticated;

grant select on table public.organizations, public.organization_members, public.organization_programs, public.program_user_access to authenticated;
grant select, insert, update, delete on table public.programs, public.episodes, public.participants to authenticated;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_program_access(uuid) to authenticated;
