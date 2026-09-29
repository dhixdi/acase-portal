-- ============================================================
-- 0003_rls.sql
-- ============================================================
alter table public.admins             enable row level security;   -- tanpa policy = tertutup untuk API
alter table public.stages             enable row level security;
alter table public.teams              enable row level security;
alter table public.team_admin_notes   enable row level security;
alter table public.team_members       enable row level security;
alter table public.case_materials     enable row level security;
alter table public.submissions        enable row level security;
alter table public.submission_events  enable row level security;
alter table public.deadline_overrides enable row level security;
alter table public.finalists          enable row level security;
alter table public.announcements      enable row level security;
alter table public.audit_log          enable row level security;

-- stages: jadwal boleh dibaca siapa saja; ubah hanya admin
create policy stages_read  on public.stages for select to anon, authenticated using (true);
create policy stages_admin on public.stages for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- teams: peserta hanya baca miliknya; tulis hanya admin (peserta lewat RPC)
create policy teams_read_own on public.teams for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy teams_admin on public.teams for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy notes_admin on public.team_admin_notes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- team_members: baca milik sendiri; tulis hanya admin (peserta lewat RPC)
create policy members_read_own on public.team_members for select to authenticated
  using (team_id = (select public.current_team_id()) or (select public.is_admin()));
create policy members_admin on public.team_members for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- case_materials: metadata pun dikunci waktu + biodata
create policy case_read on public.case_materials for select to authenticated
  using ((select public.can_access_case()) or (select public.is_admin()));
create policy case_admin on public.case_materials for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- submissions
create policy sub_read on public.submissions for select to authenticated
  using (team_id = (select public.current_team_id()) or (select public.is_admin()));
create policy sub_insert on public.submissions for insert to authenticated
  with check (team_id = (select public.current_team_id()) and public.can_submit(team_id, stage));
create policy sub_update on public.submissions for update to authenticated
  using      (team_id = (select public.current_team_id()) and public.can_submit(team_id, stage))
  with check (team_id = (select public.current_team_id()) and public.can_submit(team_id, stage));
create policy sub_delete on public.submissions for delete to authenticated
  using (team_id = (select public.current_team_id()) and public.can_submit(team_id, stage));
create policy sub_admin on public.submissions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- submission_events, audit_log: hanya admin
create policy events_admin on public.submission_events for select to authenticated
  using ((select public.is_admin()));
create policy audit_admin_read on public.audit_log for select to authenticated
  using ((select public.is_admin()));
create policy audit_admin_insert on public.audit_log for insert to authenticated
  with check ((select public.is_admin()) and actor = (select auth.uid()));

-- deadline_overrides: tim melihat miliknya (untuk countdown), admin kelola
create policy ovr_read_own on public.deadline_overrides for select to authenticated
  using (team_id = (select public.current_team_id()) or (select public.is_admin()));
create policy ovr_admin on public.deadline_overrides for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- finalists: tim melihat status miliknya hanya bila published; admin kelola
create policy fin_read_own on public.finalists for select to authenticated
  using ((published and team_id = (select public.current_team_id())) or (select public.is_admin()));
create policy fin_admin on public.finalists for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- announcements: filter audiens + waktu terbit
create policy ann_read on public.announcements for select to anon, authenticated
  using (public.can_read_announcement(audience, is_published, published_at));
create policy ann_admin on public.announcements for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
