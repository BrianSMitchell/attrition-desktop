-- Add tech_levels table for Supabase tech progression
-- Safe to run multiple times
create table if not exists tech_levels (
  id uuid primary key default gen_random_uuid(),
  empire_id uuid not null references empires(id) on delete cascade,
  tech_key text not null,
  level int not null default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (empire_id, tech_key)
);

-- Basic index for lookups by empire
create index if not exists idx_tech_levels_empire on tech_levels(empire_id);
