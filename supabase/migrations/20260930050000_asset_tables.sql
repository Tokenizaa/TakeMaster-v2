-- AssetFolder and AssetTag tables for Library functionality
-- Created on 2026-09-30

-- AssetFolder table
create table if not exists public.asset_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.asset_folders(id) on delete set null,
  episode_id uuid references public.episodes(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  color text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- AssetTag table
create table if not exists public.asset_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  episode_id uuid references public.episodes(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  usage_count integer not null default 0
);

-- Add indexes for better performance
create index if not exists idx_asset_folders_episode on public.asset_folders(episode_id);
create index if not exists idx_asset_folders_program on public.asset_folders(program_id);
create index if not exists idx_asset_folders_parent on public.asset_folders(parent_id);
create index if not exists idx_asset_tags_episode on public.asset_tags(episode_id);
create index if not exists idx_asset_tags_program on public.asset_tags(program_id);
