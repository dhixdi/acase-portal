-- ============================================================
-- RLS Tests — ACASE Portal
-- ============================================================
-- Jalankan di SQL Editor Supabase (staging) dengan peran postgres.
-- Ganti placeholder UUID berikut dengan nilai dari akun uji:
--
--   <UUID_ADMIN>   = auth.users.id untuk akun admin
--   <UUID_TEAM_A>  = auth.users.id untuk akun Tim A
--   <UUID_TEAM_B>  = auth.users.id untuk akun Tim B
--   <TEAM_A_ID>    = teams.id untuk Tim A
--   <TEAM_B_ID>    = teams.id untuk Tim B
--
-- Setiap uji dibungkus transaksi dan diakhiri ROLLBACK
-- sehingga tidak mengubah data.
-- ============================================================

-- ============================================================
-- T-ISO-1: Tim A tidak bisa membaca tim B
-- ============================================================
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;

  -- Harus mengembalikan tepat 1 baris (tim sendiri)
  select count(*) as "harus_1" from public.teams;

  -- Harus 0: tim B tidak terlihat
  select count(*) as "harus_0_teams_B" from public.teams where id = '<TEAM_B_ID>';

  -- Harus 0: anggota tim B tidak terlihat
  select count(*) as "harus_0_members_B" from public.team_members where team_id = '<TEAM_B_ID>';
rollback;


-- ============================================================
-- T-SUB-1: Submit setelah deadline ditolak
-- ============================================================
-- Prasyarat: Tim A sudah punya biodata_completed_at (jalankan RPC biodata
-- atau set manual sebelum uji). Tahap case_submission.opens_at <= now().
begin;
  -- Tutup deadline ke masa lalu
  update public.stages set closes_at = now() - interval '1 second' where key = 'case_submission';

  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;

  do $$ begin
    insert into public.submissions (team_id, stage, slot, file_path, file_name, file_size)
    values ('<TEAM_A_ID>','case_submission','main','<TEAM_A_ID>/case_submission/main.pdf','x.pdf',1000);
    raise notice 'GAGAL: seharusnya ditolak';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
rollback;


-- ============================================================
-- T-SUB-2: Submit saat terbuka berhasil, override deadline bekerja
-- ============================================================
begin;
  -- Buat deadline umum sudah lewat
  update public.stages set opens_at = now() - interval '1 hour',
                           closes_at = now() - interval '1 second' where key = 'case_submission';
  -- Beri override untuk tim A: +1 hari
  insert into public.deadline_overrides (team_id, stage, closes_at)
    values ('<TEAM_A_ID>','case_submission', now() + interval '1 day')
    on conflict (team_id, stage) do update set closes_at = excluded.closes_at;

  -- Tim A harus bisa submit
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;

  insert into public.submissions (team_id, stage, slot, file_path, file_name, file_size)
  values ('<TEAM_A_ID>','case_submission','main','<TEAM_A_ID>/case_submission/main.pdf','x.pdf',1000);
  select 'OK tim A berhasil submit dengan override' as hasil;

  -- Tim B (tanpa override) harus ditolak
  reset role;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_B>", "role": "authenticated" }',true);
  set local role authenticated;

  do $$ begin
    insert into public.submissions (team_id, stage, slot, file_path, file_name, file_size)
    values ('<TEAM_B_ID>','case_submission','main','<TEAM_B_ID>/case_submission/main.pdf','y.pdf',1000);
    raise notice 'GAGAL: tim B seharusnya ditolak';
  exception when others then
    raise notice 'OK tim B ditolak: %', sqlerrm;
  end $$;
rollback;


-- ============================================================
-- T-PIT-1: Non-finalis tidak bisa submit pitch deck
-- ============================================================
begin;
  update public.stages set opens_at = now() - interval '1 hour',
                           closes_at = now() + interval '1 day'
    where key = 'pitch_deck';

  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;

  do $$ begin
    insert into public.submissions (team_id, stage, slot, file_path, file_name, file_size)
    values ('<TEAM_A_ID>','pitch_deck','main','<TEAM_A_ID>/pitch_deck/main.pdf','p.pdf',1000);
    raise notice 'GAGAL: non-finalis seharusnya ditolak';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
rollback;


-- ============================================================
-- T-CASE-1: Case terkunci sebelum rilis (metadata dan storage)
-- ============================================================
begin;
  update public.stages set opens_at = now() + interval '1 day' where key = 'case_release';

  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;

  -- Metadata case harus tidak terlihat
  select count(*) as "harus_0_case_materials" from public.case_materials;

  -- File storage case juga tidak terlihat
  select count(*) as "harus_0_storage_case" from storage.objects where bucket_id = 'case-files';
rollback;


-- ============================================================
-- T-ESC-1: Peserta tidak bisa menaikkan hak
-- ============================================================
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;

  -- Update payment_verified: policy admin saja yang bisa write,
  -- teams_read_own hanya SELECT. UPDATE tanpa policy = 0 rows affected.
  do $$ begin
    update public.teams set payment_verified = true, is_active = true;
    raise notice 'update tidak error, cek jumlah baris terpengaruh';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
  -- Verifikasi nilai tidak berubah
  select payment_verified as "harus_nilai_semula" from public.teams;

  -- Insert ke finalists: harus ditolak
  do $$ begin
    insert into public.finalists (team_id) values ('<TEAM_A_ID>');
    raise notice 'GAGAL: peserta bisa insert finalists';
  exception when others then
    raise notice 'OK ditolak finalists: %', sqlerrm;
  end $$;

  -- Insert ke admins: harus ditolak
  do $$ begin
    insert into public.admins (user_id) values ('<UUID_TEAM_A>');
    raise notice 'GAGAL: peserta bisa insert admins';
  exception when others then
    raise notice 'OK ditolak admins: %', sqlerrm;
  end $$;
rollback;


-- ============================================================
-- T-STO-1: Storage — tim A tidak bisa menulis ke folder tim B
-- ============================================================
begin;
  update public.stages set opens_at = now() - interval '1 hour',
                           closes_at = now() + interval '1 day'
    where key = 'case_submission';

  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;

  -- Menulis ke folder tim B: harus ditolak
  do $$ begin
    insert into storage.objects (bucket_id, name, owner)
    values ('submissions','<TEAM_B_ID>/case_submission/main.pdf','<UUID_TEAM_A>');
    raise notice 'GAGAL: bisa menulis ke folder tim B';
  exception when others then
    raise notice 'OK ditolak folder tim B: %', sqlerrm;
  end $$;
rollback;


-- ============================================================
-- T-ANN-1: Filter audiens pengumuman
-- ============================================================
begin;
  insert into public.announcements (title, body, audience, is_published) values
    ('pub','isi','public',true),
    ('part','isi','participants',true),
    ('fin','isi','finalists',true),
    ('draft','isi','public',false),
    ('future','isi','public',true);
  update public.announcements set published_at = now() + interval '1 day' where title = 'future';

  -- Anon: hanya melihat 'pub'
  select set_config('request.jwt.claims','{ "role": "anon" }',true);
  set local role anon;
  select title as "anon_harus_hanya_pub" from public.announcements order by title;

  -- Tim A (authenticated): melihat pub + part (TIDAK fin, draft, future)
  reset role;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;
  select title as "teamA_harus_pub_dan_part" from public.announcements order by title;
rollback;


-- ============================================================
-- T-FIN-1: Publik hanya melihat finalis terpublikasi
-- ============================================================
begin;
  -- Tandai tim A sebagai finalis tapi belum dipublikasikan
  insert into public.finalists (team_id, published) values ('<TEAM_A_ID>', false)
    on conflict do nothing;

  select set_config('request.jwt.claims','{ "role": "anon" }',true);
  set local role anon;
  select count(*) as "harus_0_belum_publish" from public.public_finalists;

  -- Publikasikan
  reset role;
  update public.finalists set published = true where team_id = '<TEAM_A_ID>';

  select set_config('request.jwt.claims','{ "role": "anon" }',true);
  set local role anon;
  -- Harus terlihat: kode, nama, institusi saja
  select * from public.public_finalists;

  -- Anon tidak bisa langsung akses tabel finalists
  do $$ begin
    select count(*) from public.finalists;
    raise notice 'GAGAL: anon bisa baca tabel finalists';
  exception when others then
    raise notice 'OK ditolak finalists: %', sqlerrm;
  end $$;
rollback;


-- ============================================================
-- T-ADM-1: Admin melihat semua
-- ============================================================
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_ADMIN>", "role": "authenticated" }',true);
  set local role authenticated;

  -- Admin bisa melihat semua tim
  select count(*) as "admin_semua_tim" from public.admin_team_overview;

  -- Admin bisa melihat audit log
  select count(*) as "admin_audit_log" from public.audit_log;
rollback;


-- ============================================================
-- T-BIO-1: RPC biodata
-- ============================================================
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;

  select public.save_team_biodata('Tim Uji Alpha', 2, '[
    {"full_name":"Andi Wijaya","nim":"22000001","institution":"UGM","major":"Aktuaria","degree_level":"S1","batch":"2022","email":"andi@example.com","whatsapp":"081234567890","is_leader":true},
    {"full_name":"Budi Santoso","nim":"22000002","institution":"UGM","major":"Aktuaria","degree_level":"S1","batch":"2022","email":"budi@example.com","whatsapp":"081234567891","is_leader":false}
  ]'::jsonb, true);

  -- Verifikasi: nama dan biodata_completed_at harus terisi
  select name, team_size, biodata_completed_at is not null as "biodata_lengkap" from public.teams;
  select count(*) as "jumlah_anggota_harus_2" from public.team_members;
rollback;


-- ============================================================
-- T-BIO-NEG: Uji negatif biodata
-- ============================================================

-- T-BIO-NEG-1: Nama kelompok < 3 karakter
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;
  do $$ begin
    perform public.save_team_biodata('AB', 2, '[
      {"full_name":"A","nim":"001","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"a@x.com","whatsapp":"081234567890","is_leader":true},
      {"full_name":"B","nim":"002","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"b@x.com","whatsapp":"081234567891","is_leader":false}
    ]'::jsonb, true);
    raise notice 'GAGAL: nama < 3 harus ditolak';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
rollback;

-- T-BIO-NEG-2: Dua ketua
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;
  do $$ begin
    perform public.save_team_biodata('Tim Dua Ketua', 2, '[
      {"full_name":"A","nim":"001","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"a@x.com","whatsapp":"081234567890","is_leader":true},
      {"full_name":"B","nim":"002","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"b@x.com","whatsapp":"081234567891","is_leader":true}
    ]'::jsonb, true);
    raise notice 'GAGAL: dua ketua harus ditolak';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
rollback;

-- T-BIO-NEG-3: Nol ketua
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;
  do $$ begin
    perform public.save_team_biodata('Tim Nol Ketua', 2, '[
      {"full_name":"A","nim":"001","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"a@x.com","whatsapp":"081234567890","is_leader":false},
      {"full_name":"B","nim":"002","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"b@x.com","whatsapp":"081234567891","is_leader":false}
    ]'::jsonb, true);
    raise notice 'GAGAL: nol ketua harus ditolak';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
rollback;

-- T-BIO-NEG-4: Jenjang tidak valid (S2)
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;
  do $$ begin
    perform public.save_team_biodata('Tim S2', 2, '[
      {"full_name":"A","nim":"001","institution":"X","major":"Y","degree_level":"S2","batch":"2022","email":"a@x.com","whatsapp":"081234567890","is_leader":true},
      {"full_name":"B","nim":"002","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"b@x.com","whatsapp":"081234567891","is_leader":false}
    ]'::jsonb, true);
    raise notice 'GAGAL: S2 harus ditolak';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
rollback;

-- T-BIO-NEG-5: Email tidak valid
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;
  do $$ begin
    perform public.save_team_biodata('Tim Email Invalid', 2, '[
      {"full_name":"A","nim":"001","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"bukan-email","whatsapp":"081234567890","is_leader":true},
      {"full_name":"B","nim":"002","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"b@x.com","whatsapp":"081234567891","is_leader":false}
    ]'::jsonb, true);
    raise notice 'GAGAL: email invalid harus ditolak';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
rollback;

-- T-BIO-NEG-6: WhatsApp tidak valid
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;
  do $$ begin
    perform public.save_team_biodata('Tim WA Invalid', 2, '[
      {"full_name":"A","nim":"001","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"a@x.com","whatsapp":"abcdef","is_leader":true},
      {"full_name":"B","nim":"002","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"b@x.com","whatsapp":"081234567891","is_leader":false}
    ]'::jsonb, true);
    raise notice 'GAGAL: WA invalid harus ditolak';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
rollback;

-- T-BIO-NEG-7: consent=false pada penyimpanan pertama
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;
  do $$ begin
    perform public.save_team_biodata('Tim No Consent', 2, '[
      {"full_name":"A","nim":"001","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"a@x.com","whatsapp":"081234567890","is_leader":true},
      {"full_name":"B","nim":"002","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"b@x.com","whatsapp":"081234567891","is_leader":false}
    ]'::jsonb, false);
    raise notice 'GAGAL: consent false harus ditolak';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
rollback;

-- T-BIO-NEG-8: Jumlah anggota tidak cocok (bilang 3 tapi kirim 2)
begin;
  select set_config('request.jwt.claims','{ "sub": "<UUID_TEAM_A>", "role": "authenticated" }',true);
  set local role authenticated;
  do $$ begin
    perform public.save_team_biodata('Tim Mismatch', 3, '[
      {"full_name":"A","nim":"001","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"a@x.com","whatsapp":"081234567890","is_leader":true},
      {"full_name":"B","nim":"002","institution":"X","major":"Y","degree_level":"S1","batch":"2022","email":"b@x.com","whatsapp":"081234567891","is_leader":false}
    ]'::jsonb, true);
    raise notice 'GAGAL: mismatch harus ditolak';
  exception when others then
    raise notice 'OK ditolak: %', sqlerrm;
  end $$;
rollback;
