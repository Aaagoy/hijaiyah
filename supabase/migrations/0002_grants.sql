-- New Supabase projects no longer grant table privileges to the API roles automatically.
-- Without these, every query fails with "permission denied for table ...".
-- Run once in the Supabase SQL editor, after 0001_init.sql.

grant usage on schema public to anon, authenticated, service_role;

-- Visitors: only the level list (landing page). Row access is still limited by RLS.
grant select on public.levels to anon;

-- Signed-in learners: read content and their own progress; log attempts.
-- Progress and XP are written only through complete_sublevel() (security definer).
grant select on public.levels, public.sublevels, public.items to authenticated;
grant select on public.profiles, public.item_progress, public.sublevel_progress to authenticated;
grant select, insert on public.attempts to authenticated;

-- Seed script (service role key, server-side only).
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
