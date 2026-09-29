-- ============================================================
-- 0004_views.sql
-- ============================================================

-- Untuk admin: ringkasan per tim. security_invoker = RLS pemanggil berlaku
-- (non-admin hanya akan melihat timnya sendiri).
create or replace view public.admin_team_overview
with (security_invoker = true) as
select
  t.id, t.code, t.name, t.login_email, t.team_size, t.category,
  t.payment_verified, t.is_active, t.biodata_completed_at, t.consent_at,
  (select m.full_name from public.team_members m where m.team_id = t.id and m.is_leader) as leader_name,
  (select m.email     from public.team_members m where m.team_id = t.id and m.is_leader) as leader_email,
  (select m.whatsapp  from public.team_members m where m.team_id = t.id and m.is_leader) as leader_whatsapp,
  (select string_agg(distinct m.institution, ', ' order by m.institution)
     from public.team_members m where m.team_id = t.id) as institutions,
  (select s.updated_at from public.submissions s
    where s.team_id = t.id and s.stage = 'case_submission' and s.slot = 'main') as case_submitted_at,
  (select s.file_size from public.submissions s
    where s.team_id = t.id and s.stage = 'case_submission' and s.slot = 'main') as case_file_size,
  (select s.updated_at from public.submissions s
    where s.team_id = t.id and s.stage = 'pitch_deck' and s.slot = 'main') as pitch_submitted_at,
  exists (select 1 from public.finalists f where f.team_id = t.id)                  as is_finalist,
  exists (select 1 from public.finalists f where f.team_id = t.id and f.published)  as finalist_published,
  (select o.closes_at from public.deadline_overrides o
    where o.team_id = t.id and o.stage = 'case_submission')                         as case_override_closes_at
from public.teams t;

-- Publik: daftar finalis yang SUDAH dipublikasikan. Sengaja dijalankan dengan hak pemilik
-- (bukan security_invoker) agar anon bisa membaca; hanya membuka kode, nama tim, kampus.
create or replace view public.public_finalists as
select
  t.code,
  t.name,
  (select string_agg(distinct m.institution, ', ' order by m.institution)
     from public.team_members m where m.team_id = t.id) as institutions
from public.finalists f
join public.teams t on t.id = f.team_id
where f.published;
