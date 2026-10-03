-- Add guest columns to episodes table (if not already present)

alter table public.episodes
add column if not exists guest_name text,
add column if not exists guest_id uuid references public.participants(id) on delete set null;

create index if not exists episodes_guest_id_idx on public.episodes (guest_id);