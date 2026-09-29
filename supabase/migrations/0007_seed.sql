-- ============================================================
-- 0007_seed.sql  (ubah tanggal/jam sesuai keputusan panitia; semua WIB = +07)
-- ============================================================
insert into public.stages (key, label, opens_at, closes_at) values
  ('case_release',    'Case Release',          '2026-10-02 08:00:00+07', null),
  ('case_submission', 'Case Submission',       '2026-10-02 08:00:00+07', '2026-10-29 23:59:59+07'),
  ('pitch_deck',      'Pitch Deck Submission', '2026-11-21 00:00:00+07', '2026-11-26 23:59:59+07')
on conflict (key) do update
  set label = excluded.label, opens_at = excluded.opens_at, closes_at = excluded.closes_at;
