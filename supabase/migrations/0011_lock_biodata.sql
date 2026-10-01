-- ============================================================
-- 0011_lock_biodata.sql
-- ============================================================

-- Ubah biodata_editable agar mengembalikan false jika biodata_completed_at sudah terisi
create or replace function public.biodata_editable(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teams 
    where id = p_team and biodata_completed_at is null
  );
$$;
