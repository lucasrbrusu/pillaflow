begin;

alter table if exists public.user_settings
add column if not exists premium_trial_prompt_dismissed_at timestamptz;

commit;
