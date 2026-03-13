-- Adds an optional account-level daily steps goal to public.profiles.
-- Run this file in the Supabase SQL editor.

alter table if exists public.profiles
  add column if not exists daily_steps_goal integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_daily_steps_goal_check'
  ) then
    alter table public.profiles
      add constraint profiles_daily_steps_goal_check
      check (daily_steps_goal is null or daily_steps_goal >= 0);
  end if;
end
$$;
