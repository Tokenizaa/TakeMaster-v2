-- F5: private RS Play TV onboarding and program contracting
insert into public.organizations (name, slug, status)
values ('RS Play TV', 'rs-play-tv', 'active')
on conflict (slug) do update set name = excluded.name, status = excluded.status;

create table if not exists public.program_user_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  catalog_program_id uuid not null references public.program_catalog(id) on delete cascade,
  role text not null default 'representative' check (role in ('representative','producer','editor','admin')),
  status text not null default 'active' check (status in ('pending','active','revoked')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, catalog_program_id)
);

alter table public.program_user_access enable row level security;

create policy program_user_access_select_own
on public.program_user_access for select to authenticated
using ((select auth.uid()) = user_id);

create policy program_user_access_select_org_admin
on public.program_user_access for select to authenticated
using (tm_private.is_org_role(organization_id, array['owner','admin']));

create or replace function tm_private.contract_program_for_user(p_catalog_program_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, tm_private, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_plan uuid;
  v_subscription uuid;
  v_program uuid;
  v_catalog record;
  v_existing record;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select id into v_org from public.organizations
  where slug = 'rs-play-tv' and status = 'active' limit 1;
  if v_org is null then raise exception 'RS_PLAY_ORGANIZATION_NOT_CONFIGURED'; end if;

  select id, slug, name, description, host, format into v_catalog
  from public.program_catalog
  where id = p_catalog_program_id and active = true and contractable = true;
  if v_catalog.id is null then raise exception 'PROGRAM_NOT_FOUND'; end if;

  select pp.plan_id into v_plan
  from public.plan_programs pp
  join public.commercial_plans cp on cp.id = pp.plan_id and cp.active = true
  where pp.catalog_program_id = p_catalog_program_id
  order by cp.code limit 1;
  if v_plan is null then raise exception 'COMMERCIAL_PLAN_NOT_CONFIGURED'; end if;

  select op.status, op.subscription_id into v_existing
  from public.organization_programs op
  where op.organization_id = v_org and op.catalog_program_id = p_catalog_program_id;

  if v_existing.status is not null and v_existing.status <> 'revoked' then
    if v_existing.status = 'active' then
      insert into public.organization_members (organization_id, user_id, role, active)
      values (v_org, v_user, 'member', true)
      on conflict (organization_id, user_id) do update set active = true;
      insert into public.program_user_access (user_id, organization_id, catalog_program_id, role, status)
      values (v_user, v_org, p_catalog_program_id, 'representative', 'active')
      on conflict (user_id, catalog_program_id) do update
        set organization_id = excluded.organization_id, status = 'active', updated_at = now();
      return jsonb_build_object('success', true, 'subscriptionId', v_existing.subscription_id,
        'programId', (select program_id from public.organization_programs
          where organization_id = v_org and catalog_program_id = p_catalog_program_id));
    end if;
    raise exception 'PROGRAM_NOT_AVAILABLE';
  end if;

  insert into public.organization_members (organization_id, user_id, role, active)
  values (v_org, v_user, 'member', true)
  on conflict (organization_id, user_id) do update set active = true;

  insert into public.organization_subscriptions (organization_id, plan_id, status)
  values (v_org, v_plan, 'active')
  returning id into v_subscription;

  insert into public.programs (
    legacy_id, name, title, description, host, format, organization_id,
    catalog_program_id, standard_structure, default_segments, standard_segments
  ) values (
    'org-' || v_org || '-catalog-' || v_catalog.slug, v_catalog.name, v_catalog.name,
    coalesce(v_catalog.description, ''), v_catalog.host, coalesce(v_catalog.format, 'Programa'),
    v_org, v_catalog.id, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
  ) returning id into v_program;

  insert into public.organization_programs (
    organization_id, catalog_program_id, subscription_id, program_id, status
  ) values (v_org, v_catalog.id, v_subscription, v_program, 'active');

  insert into public.program_user_access (
    user_id, organization_id, catalog_program_id, role, status
  ) values (v_user, v_org, v_catalog.id, 'representative', 'active');

  return jsonb_build_object('success', true, 'subscriptionId', v_subscription,
    'programId', v_program, 'organizationId', v_org);
end;
$$;

revoke all on function tm_private.contract_program_for_user(uuid) from public;
grant execute on function tm_private.contract_program_for_user(uuid) to authenticated;

drop function if exists tm_private.bootstrap_organization(text);
