-- Run this in the Supabase SQL editor.
-- Adds app-level email verification fields and stores one-time verification codes.

alter table if exists public.profiles
  add column if not exists email_verified boolean not null default false;

alter table if exists public.profiles
  add column if not exists email_verified_at timestamptz;

create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  sent_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_verification_codes_user_id_idx
  on public.email_verification_codes (user_id);

create index if not exists email_verification_codes_lookup_idx
  on public.email_verification_codes (user_id, email, consumed_at, expires_at);

alter table if exists public.email_verification_codes enable row level security;

revoke all on table public.email_verification_codes from anon;
revoke all on table public.email_verification_codes from authenticated;
