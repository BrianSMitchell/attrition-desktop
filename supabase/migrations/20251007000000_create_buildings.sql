-- Migration: create buildings table for server routes
create extension if not exists pgcrypto;

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  empire_id uuid not null,
  location_coord text not null,
  catalog_key text not null,
  level integer not null default 1,
  is_active boolean not null default false,
  pending_upgrade boolean not null default false,
  credits_cost integer not null default 0,
  construction_started timestamptz,
  construction_completed timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buildings_empire_coord_active_idx
  on public.buildings (empire_id, location_coord, is_active);

create index if not exists buildings_empire_coord_key_idx
  on public.buildings (empire_id, location_coord, catalog_key);

create index if not exists buildings_construction_completed_idx
  on public.buildings (construction_completed);
