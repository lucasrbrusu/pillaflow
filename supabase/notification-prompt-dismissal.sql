-- Optional account-level persistence for the notification permission prompt.
-- Null means the user can still be asked again when app notifications are disabled
-- at the device level. A timestamp means "don't ask me again" was chosen.

alter table if exists public.user_settings
add column if not exists notification_prompt_dismissed_at timestamptz;
