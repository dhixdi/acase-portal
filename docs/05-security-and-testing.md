# 05 — Keamanan dan Pengujian

Dokumen ini adalah **gerbang kualitas**. Agent tidak boleh menyatakan proyek selesai sebelum semua uji di sini dijalankan dan hasilnya dilaporkan (lulus/gagal + bukti).

## 1. Model ancaman (ringkas)

| Ancaman | Contoh | Mitigasi |
|---|---|---|
| Peserta melihat data tim lain | Mengubah `team_id` di request | RLS berbasis `current_team_id()`; path storage terkunci ke `team_id` |
| Peserta mengambil case sebelum rilis | Memanggil storage API langsung | Policy storage `can_access_case()`; file tidak pernah ada di repo publik |
| Peserta submit setelah deadline | Menonaktifkan validasi di JS | `can_submit()` di policy tabel **dan** storage; waktu = `now()` server |
| Non-finalis submit pitch deck | Memanggil API dengan `stage='pitch_deck'` | `can_submit()` memeriksa `is_finalist()` |
| Peserta menaikkan hak | Update `finalists`, `payment_verified`, `is_active` | Tidak ada policy tulis peserta pada tabel tersebut; biodata hanya lewat RPC |
| Pembajakan admin | Menambah diri ke `admins` | Tabel `admins` tanpa policy, `REVOKE` dari anon/authenticated |
| Kebocoran kunci | `service_role` di repo/frontend | Hanya di laptop admin; pemindaian repo sebelum rilis |
| XSS lewat pengumuman | HTML/JS pada isi pengumuman | `react-markdown` tanpa HTML mentah; tanpa `dangerouslySetInnerHTML` |
| Unggahan berbahaya | File `.exe` bernama `.pdf` | Batas ukuran + `allowed_mime_types` bucket + cek header `%PDF-` di klien; file hanya diunduh admin |
| Brute force login | Menebak password | Rate limit bawaan Supabase Auth; password acak 12 karakter |
| Enumerasi akun | Mengetahui email terdaftar | Pesan login generik; signup dimatikan |
| Auto-pause / kehilangan data | Project tidur / kesalahan admin | Keep-alive, ekspor rutin, runbook |
| Kebocoran data pribadi | Ekspor CSV tersebar | Ekspor hanya admin; hapus data pasca-lomba |

## 2. Checklist keamanan (wajib centang sebelum rilis)

**Supabase**
- [ ] Semua tabel `public` memiliki `rowsecurity = true` (query verifikasi di dokumen 02 bagian 11).
- [ ] Bucket `case-files`, `submissions`, `student-proofs` semuanya **private**.
- [ ] Signup publik **dimatikan** (coba `signUp()` dari klien anon → harus gagal).
- [ ] Tabel `admins` tidak dapat dibaca/ditulis lewat API (uji dengan anon dan authenticated).
- [ ] `anon` hanya bisa membaca `stages`, `announcements` (terbatas RLS), dan `public_finalists`.
- [ ] Fungsi `SECURITY DEFINER` semuanya memakai `set search_path = public`.
- [ ] Admin dibuat manual dan jumlahnya minimal.
- [ ] Password minimum 8 karakter; SMTP custom terpasang jika reset email dipakai.
- [ ] Site URL dan Redirect URLs hanya domain portal (dan localhost dev).

**Repo & frontend**
- [ ] `grep -RIn "service_role" .` tidak menemukan apa pun kecuali komentar di skrip/dokumen.
- [ ] `.gitignore` mencakup `.env*`, `scripts/credentials-*.csv`, `node_modules`.
- [ ] Bundle produksi tidak memuat string `service_role` (`grep` pada `web/dist`).
- [ ] Riwayat git bersih dari kredensial (jika pernah bocor: rotasi kunci, jangan hanya menghapus commit).
- [ ] Tidak ada `dangerouslySetInnerHTML`; markdown tanpa plugin HTML mentah.
- [ ] Tautan eksternal memakai `rel="noopener noreferrer"`.
- [ ] Tidak ada analytics/skrip pihak ketiga yang tidak perlu.
- [ ] Repo GitHub Pages **publik**: pastikan tidak ada file case, data peserta, atau kredensial di dalamnya.

**Operasional**
- [ ] Ekspor CSV kredensial dihapus dari laptop setelah dibagikan lewat kanal aman.
- [ ] Admin memakai password unik + (idealnya) MFA.

## 3. Menyiapkan data uji (di project staging)

1. Buat 3 pengguna lewat dashboard/skrip: `admin@test`, `teamA@test`, `teamB@test`.
2. Daftarkan admin: `insert into admins ...` (lihat dokumen 02 bagian 8).
3. Buat baris `teams` untuk A dan B lewat `create-accounts.mjs` (bukan manual).
4. Catat UUID `auth.users` masing-masing (`select id, email from auth.users;`).

## 4. Harness uji RLS di SQL Editor

Semua uji dibungkus transaksi dan diakhiri `rollback` sehingga tidak mengubah data. Ganti `<UUID_...>`.

```sql
-- Template: menyamar sebagai pengguna tertentu
begin;
  -- (opsional) ubah data/jadwal untuk skenario, dilakukan SEBAGAI postgres:
  -- update public.stages set closes_at = now() - interval '1 second' where key = 'case_submission';

  select set_config('request.jwt.claims',
    '{"sub":"<UUID_TEAM_A>","role":"authenticated"}', true);
  set local role authenticated;

  -- ... pernyataan uji di sini ...

rollback;
```

Untuk peran anonim:

```sql
begin;
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  -- ... uji ...
rollback;
```

Untuk melihat penolakan, bungkus dengan `do $$ begin ... exception when others then raise notice 'DITOLAK: %', sqlerrm; end $$;`.

### Contoh uji yang sudah siap pakai

**T-ISO-1: Tim A tidak bisa membaca tim B**
```sql
begin;
  select set_config('request.jwt.claims','{"sub":"<UUID_TEAM_A>","role":"authenticated"}',true);
  set local role authenticated;
  select count(*) as harus_1 from public.teams;                       -- hanya miliknya
  select count(*) as harus_0 from public.teams where id = '<TEAM_B_ID>';
  select count(*) as harus_0 from public.team_members where team_id = '<TEAM_B_ID>';
rollback;
```

**T-SUB-1: Submit setelah deadline ditolak**
```sql
begin;
  update public.stages set closes_at = now() - interval '1 second' where key = 'case_submission';
  select set_config('request.jwt.claims','{"sub":"<UUID_TEAM_A>","role":"authenticated"}',true);
  set local role authenticated;
  do $$ begin
    insert into public.submissions (team_id, stage, slot, file_path, file_name, file_size)
    values ('<TEAM_A_ID>','case_submission','main','<TEAM_A_ID>/case_submission/main.pdf','x.pdf',1000);
    raise notice 'GAGAL: seharusnya ditolak';
  exception when others then raise notice 'OK ditolak: %', sqlerrm; end $$;
rollback;
```
> Prasyarat: tim A sudah punya `biodata_completed_at` (jalankan RPC biodata lebih dulu di staging) dan tahap `case_submission` sudah `opens_at <= now()` (ubah jadwal untuk uji).

**T-SUB-2: Submit saat terbuka berhasil, override deadline bekerja**
```sql
begin;
  update public.stages set opens_at = now() - interval '1 hour',
                           closes_at = now() - interval '1 second' where key = 'case_submission';
  insert into public.deadline_overrides (team_id, stage, closes_at)
    values ('<TEAM_A_ID>','case_submission', now() + interval '1 day');
  select set_config('request.jwt.claims','{"sub":"<UUID_TEAM_A>","role":"authenticated"}',true);
  set local role authenticated;
  insert into public.submissions (team_id, stage, slot, file_path, file_name, file_size)
  values ('<TEAM_A_ID>','case_submission','main','<TEAM_A_ID>/case_submission/main.pdf','x.pdf',1000);
  select 'OK tim A berhasil' as hasil;
  -- tim B (tanpa override) harus ditolak: ulangi dengan sub B -> error
rollback;
```

**T-PIT-1: Non-finalis tidak bisa submit pitch deck**
```sql
begin;
  update public.stages set opens_at = now() - interval '1 hour', closes_at = now() + interval '1 day'
    where key = 'pitch_deck';
  select set_config('request.jwt.claims','{"sub":"<UUID_TEAM_A>","role":"authenticated"}',true);
  set local role authenticated;
  do $$ begin
    insert into public.submissions (team_id, stage, slot, file_path, file_name, file_size)
    values ('<TEAM_A_ID>','pitch_deck','main','<TEAM_A_ID>/pitch_deck/main.pdf','p.pdf',1000);
    raise notice 'GAGAL';
  exception when others then raise notice 'OK ditolak: %', sqlerrm; end $$;
rollback;
```

**T-CASE-1: Case terkunci sebelum rilis (metadata dan storage)**
```sql
begin;
  update public.stages set opens_at = now() + interval '1 day' where key = 'case_release';
  select set_config('request.jwt.claims','{"sub":"<UUID_TEAM_A>","role":"authenticated"}',true);
  set local role authenticated;
  select count(*) as harus_0 from public.case_materials;
  select count(*) as harus_0 from storage.objects where bucket_id = 'case-files';
rollback;
```

**T-ESC-1: Peserta tidak bisa menaikkan hak**
```sql
begin;
  select set_config('request.jwt.claims','{"sub":"<UUID_TEAM_A>","role":"authenticated"}',true);
  set local role authenticated;
  do $$ begin update public.teams set payment_verified = true, is_active = true; 
    raise notice 'update tidak error, cek jumlah baris'; exception when others then raise notice 'OK: %', sqlerrm; end $$;
  select payment_verified as harus_nilai_semula from public.teams;
  do $$ begin insert into public.finalists (team_id) values ('<TEAM_A_ID>');
    raise notice 'GAGAL'; exception when others then raise notice 'OK ditolak: %', sqlerrm; end $$;
  do $$ begin insert into public.admins (user_id) values ('<UUID_TEAM_A>');
    raise notice 'GAGAL'; exception when others then raise notice 'OK ditolak: %', sqlerrm; end $$;
rollback;
```
(UPDATE tanpa policy tidak error tetapi memengaruhi 0 baris; yang penting nilai tidak berubah.)

**T-STO-1: Storage — tim A tidak bisa menulis ke folder tim B**
```sql
begin;
  update public.stages set opens_at = now() - interval '1 hour', closes_at = now() + interval '1 day'
    where key = 'case_submission';
  select set_config('request.jwt.claims','{"sub":"<UUID_TEAM_A>","role":"authenticated"}',true);
  set local role authenticated;
  do $$ begin
    insert into storage.objects (bucket_id, name, owner) values ('submissions','<TEAM_B_ID>/case_submission/main.pdf','<UUID_TEAM_A>');
    raise notice 'GAGAL';
  exception when others then raise notice 'OK ditolak: %', sqlerrm; end $$;
  -- folder sendiri (prasyarat: biodata A lengkap) harus berhasil:
  insert into storage.objects (bucket_id, name, owner) values ('submissions','<TEAM_A_ID>/case_submission/main.pdf','<UUID_TEAM_A>');
  select 'OK folder sendiri' as hasil;
rollback;
```

**T-ANN-1: Filter audiens pengumuman**
```sql
begin;
  insert into public.announcements (title, body, audience, is_published) values
    ('pub','x','public',true), ('part','x','participants',true), ('fin','x','finalists',true),
    ('draft','x','public',false), ('future','x','public',true);
  update public.announcements set published_at = now() + interval '1 day' where title = 'future';

  select set_config('request.jwt.claims','{"role":"anon"}',true);
  set local role anon;
  select title from public.announcements order by title;       -- harus hanya: pub

  reset role;
  select set_config('request.jwt.claims','{"sub":"<UUID_TEAM_A>","role":"authenticated"}',true);
  set local role authenticated;
  select title from public.announcements order by title;       -- pub, part (TIDAK fin, draft, future)
rollback;
```

**T-FIN-1: Publik hanya melihat finalis terpublikasi**
```sql
begin;
  insert into public.finalists (team_id, published) values ('<TEAM_A_ID>', false);
  select set_config('request.jwt.claims','{"role":"anon"}',true);
  set local role anon;
  select count(*) as harus_0 from public.public_finalists;
  reset role;
  update public.finalists set published = true;
  set local role anon;
  select * from public.public_finalists;                         -- kode, nama, institusi saja
  select count(*) from public.finalists;                         -- harus ERROR permission denied
rollback;
```

**T-ADM-1: Admin melihat semua**
```sql
begin;
  select set_config('request.jwt.claims','{"sub":"<UUID_ADMIN>","role":"authenticated"}',true);
  set local role authenticated;
  select count(*) from public.admin_team_overview;               -- semua tim
  select count(*) from public.audit_log;                          -- boleh
rollback;
```

**T-BIO-1: RPC biodata**
```sql
begin;
  select set_config('request.jwt.claims','{"sub":"<UUID_TEAM_A>","role":"authenticated"}',true);
  set local role authenticated;
  select public.save_team_biodata('Tim Uji A', 2, '[
    {"full_name":"Andi","nim":"22/000001","institution":"UGM","major":"Aktuaria","degree_level":"S1","batch":"2022","email":"a@x.com","whatsapp":"081234567890","is_leader":true},
    {"full_name":"Budi","nim":"22/000002","institution":"UGM","major":"Aktuaria","degree_level":"S1","batch":"2022","email":"b@x.com","whatsapp":"081234567891","is_leader":false}
  ]'::jsonb, true);
  select name, team_size, biodata_completed_at is not null from public.teams;   -- lengkap
rollback;
```
Uji negatif (masing-masing harus error dan **tidak meninggalkan data parsial**): 0 ketua, 2 ketua, nama tim < 3 karakter, nama sama dengan tim B (beda huruf besar/kecil), jumlah anggota tidak cocok, email invalid, WhatsApp invalid, `consent=false` pada penyimpanan pertama, jenjang `S2`.

## 5. Matriks uji end-to-end (manual, lewat aplikasi)

Jalankan di staging dengan akun A, B, admin, dan browser anonim. Catat P (pass) / F (fail).

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| E-01 | Buka `#/case` tanpa login | Diarahkan ke login |
| E-02 | Login A dengan password salah | Pesan generik, tanpa bocor info |
| E-03 | Akun A dinonaktifkan admin lalu login | Layar akun nonaktif; tidak ada data |
| E-04 | Isi biodata 3 anggota, simpan | Sukses; checklist dashboard berubah |
| E-05 | Simpan nama tim sama seperti tim B | Ditolak dengan pesan jelas; tidak ada data parsial |
| E-06 | Buka case sebelum waktu rilis | Terkunci + countdown; URL storage langsung ditolak |
| E-07 | Setelah rilis, biodata belum lengkap | Diminta melengkapi biodata |
| E-08 | Unduh materi case | File terunduh; signed URL kadaluarsa < 60 dtk |
| E-09 | Upload PDF valid | Bukti tampil (nama, ukuran, waktu server) |
| E-10 | Upload ulang (timpa) | Terganti; event `replace` tercatat |
| E-11 | Upload `.docx` yang di-rename `.pdf` | Ditolak (header) |
| E-12 | Upload PDF > 10 MB | Ditolak |
| E-13 | Ubah jam laptop peserta ±1 hari | Countdown tetap mengikuti server |
| E-14 | Setelah deadline: klik upload / panggil API | Ditolak; UI menampilkan terkunci |
| E-15 | Admin beri override +2 hari untuk A | A bisa upload; B tetap ditolak |
| E-16 | A buka URL file B di storage | Ditolak |
| E-17 | Pengumuman `participants` dilihat anonim | Tidak muncul |
| E-18 | Pengumuman terjadwal masa depan | Tidak muncul sampai waktunya |
| E-19 | Admin tandai finalis (belum publik) | Publik tak melihat; tim melihat Pitch Deck masih terkunci |
| E-20 | Admin publikasikan finalis | Muncul di halaman publik; Pitch Deck terbuka untuk finalis |
| E-21 | Non-finalis upload pitch deck via API | Ditolak |
| E-22 | Admin unduh ZIP mode nama | `Nama Kelompok.pdf`, nama bersih, tanpa duplikat |
| E-23 | Dua tim bernama mirip (`Tim A` vs `tim a`) — hanya bisa bila salah satu diubah admin | Nama file bentrok ditangani dengan sufiks kode |
| E-24 | Admin ZIP mode kode | `ACASE-007.pdf` dst. |
| E-25 | Non-admin buka `#/admin` | Ditolak; API mengembalikan kosong |
| E-26 | Ekspor CSV dibuka di Excel | Karakter Indonesia benar, kolom rapi |
| E-27 | Tampilan mobile 360 px pada semua halaman | Tidak ada overflow horizontal |
| E-28 | Refresh halaman di tiap rute | Tetap di halaman yang sama (HashRouter) |
| E-29 | Kondisi jaringan putus saat upload | Pesan galat, dapat mencoba lagi, tidak ada status "terkirim" palsu |
| E-30 | Dua tab upload bersamaan | Hasil akhir konsisten (last-write-wins), tidak ada duplikat baris |

## 6. Pengujian beban ringan (sebelum deadline)

- Simulasikan 30–50 unggahan PDF 3–5 MB dalam 10 menit (skrip Node dengan beberapa akun uji di staging). Pastikan tidak ada galat 429/500 dan latensi wajar.
- Periksa penggunaan storage dan egress di dashboard sebelum dan sesudah.
- Ingat: puncak trafik biasanya 1–2 jam sebelum deadline. Umumkan agar peserta tidak menunggu menit terakhir.

## 7. Format laporan yang diminta dari agent

```
## Laporan Uji
Lingkungan: staging (project ref ...), tanggal ...
| ID | Hasil | Bukti (potongan output/screenshot) | Catatan |
...
Ringkasan: X lulus / Y gagal / Z tidak diuji (alasan)
Temuan keamanan: ...
Perbaikan yang dilakukan: ...
```

Jika ada uji **gagal**, perbaiki lewat migrasi baru, jalankan ulang uji terkait dan uji regresi T-ISO-1, T-SUB-1, T-CASE-1.
