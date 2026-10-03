-- F5/F10: commercial catalog, tenant entitlements and private media storage
create table if not exists public.program_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  host text,
  format text,
  source_name text not null default 'RS Play TV',
  source_url text,
  source_scraped_at timestamptz not null default now(),
  active boolean not null default true,
  contractable boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  billing_period text not null default 'monthly',
  price_cents integer,
  currency text not null default 'BRL',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_programs (
  plan_id uuid not null references public.commercial_plans(id) on delete cascade,
  catalog_program_id uuid not null references public.program_catalog(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(plan_id, catalog_program_id)
);

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.commercial_plans(id),
  status text not null default 'active' check(status in ('trial','active','paused','cancelled','expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_programs (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  catalog_program_id uuid not null references public.program_catalog(id),
  subscription_id uuid references public.organization_subscriptions(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null,
  status text not null default 'active' check(status in ('pending','active','paused','revoked')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(organization_id,catalog_program_id)
);

alter table public.programs add column if not exists catalog_program_id uuid references public.program_catalog(id) on delete set null;

alter table public.program_catalog enable row level security;
alter table public.commercial_plans enable row level security;
alter table public.plan_programs enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.organization_programs enable row level security;

create policy catalog_public_select on public.program_catalog for select to anon, authenticated using(active=true and contractable=true);
create policy plans_public_select on public.commercial_plans for select to authenticated using(active=true);
create policy plan_programs_public_select on public.plan_programs for select to authenticated using(exists(select 1 from public.commercial_plans p where p.id=plan_id and p.active=true));
create policy org_subscriptions_access on public.organization_subscriptions for all to authenticated using(tm_private.is_org_member(organization_id)) with check(tm_private.is_org_role(organization_id,array['owner','admin']));
create policy org_programs_access on public.organization_programs for all to authenticated using(tm_private.is_org_member(organization_id)) with check(tm_private.is_org_role(organization_id,array['owner','admin']));

insert into public.commercial_plans(code,name,description)
values('program-standard','Programa','Acesso operacional a programas contratados individualmente')
on conflict(code) do nothing;

create or replace function tm_private.bootstrap_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'ORG_NAME_REQUIRED'; end if;
  select om.organization_id into v_org
  from public.organization_members om
  where om.user_id=auth.uid() and om.active=true
  order by om.created_at limit 1;
  if v_org is not null then return v_org; end if;
  insert into public.organizations(name,slug,status)
  values(trim(p_name), lower(regexp_replace(trim(p_name),'[^a-zA-Z0-9]+','-','g')) || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8),'active')
  returning id into v_org;
  insert into public.organization_members(organization_id,user_id,role,active)
  values(v_org,auth.uid(),'owner',true);
  return v_org;
end
$$;

revoke all on function tm_private.bootstrap_organization(text) from public;
grant execute on function tm_private.bootstrap_organization(text) to authenticated;

insert into storage.buckets(id,name,public)
values('takemaster-library','takemaster-library',false)
on conflict(id) do update set public=false;

create policy tm_library_select on storage.objects for select to authenticated
using(bucket_id='takemaster-library' and tm_private.is_org_member(((storage.foldername(name))[2])::uuid));
create policy tm_library_insert on storage.objects for insert to authenticated
with check(bucket_id='takemaster-library' and tm_private.is_org_member(((storage.foldername(name))[2])::uuid));
create policy tm_library_update on storage.objects for update to authenticated
using(bucket_id='takemaster-library' and tm_private.is_org_member(((storage.foldername(name))[2])::uuid))
with check(bucket_id='takemaster-library' and tm_private.is_org_member(((storage.foldername(name))[2])::uuid));
create policy tm_library_delete on storage.objects for delete to authenticated
using(bucket_id='takemaster-library' and tm_private.is_org_role(((storage.foldername(name))[2])::uuid,array['owner','admin']));