-- ============================================================
-- 0008_relax_submit.sql
-- Hapus syarat biodata_completed_at dari fungsi can_submit
-- agar peserta bisa submit tanpa harus mengisi biodata terlebih dahulu.
-- ============================================================
create or replace function public.can_submit(p_team uuid, p_stage text) returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from public.teams t
             where t.id = p_team and t.user_id = auth.uid()
               and t.is_active)
    and p_stage in ('case_submission','pitch_deck')
    and public.stage_is_open(p_team, p_stage)
    and (p_stage <> 'pitch_deck' or public.is_finalist(p_team));
$$;
