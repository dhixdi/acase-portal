-- ============================================================
-- 0006_hardening.sql
-- ============================================================
-- anon hanya boleh membaca: stages, announcements (dibatasi RLS), public_finalists
revoke all on all tables in schema public from anon;
grant select on public.stages, public.announcements, public.public_finalists to anon;

-- admins tidak boleh disentuh lewat API sama sekali
revoke all on public.admins from anon, authenticated;

-- view admin: hanya untuk authenticated (RLS pemanggil tetap berlaku)
grant select on public.admin_team_overview to authenticated;
grant select on public.public_finalists to authenticated;
