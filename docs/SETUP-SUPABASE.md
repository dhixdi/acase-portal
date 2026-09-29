# Panduan Setup Supabase — ACASE Portal

Langkah-langkah manual yang harus dilakukan di dashboard Supabase.

## 1. Buat Project

1. Buka [app.supabase.com](https://app.supabase.com) dan buat project baru.
2. Pilih region **Southeast Asia (Singapore)**.
3. Catat **Project URL** dan **anon key** dari Settings → API.
4. Simpan **service_role key** **hanya di laptop admin** (JANGAN bagikan ke siapa pun, JANGAN taruh di repo).
5. (Opsional) Buat project kedua sebagai **staging** untuk testing.

## 2. Konfigurasi Authentication

1. Buka **Authentication → Sign In / Providers**.
2. Pastikan provider **Email** aktif.
3. **Matikan** "Allow new users to sign up" (uncheck).
4. Set **Minimum password length** = 8.
5. Buka **Authentication → URL Configuration**:
   - **Site URL**: isi dengan domain portal final (mis. `https://portal.asiq.mipa.ugm.ac.id`).
   - **Redirect URLs**: tambahkan domain yang sama, DAN `http://localhost:5173` (untuk development).
6. (Opsional, hanya jika mau reset password via email) **Authentication → SMTP Settings**: pasang custom SMTP.

## 3. Jalankan Migrasi SQL

Buka **SQL Editor** di Supabase Dashboard. Jalankan file migrasi **berurutan**, satu per satu:

1. `0001_tables.sql` — Membuat semua tabel
2. `0002_functions.sql` — Membuat fungsi helper, RPC, trigger
3. `0003_rls.sql` — Mengaktifkan RLS dan membuat policy
4. `0004_views.sql` — Membuat view admin dan public_finalists
5. `0005_storage.sql` — Membuat bucket dan policy storage
6. `0006_hardening.sql` — Membatasi hak anon dan authenticated
7. `0007_seed.sql` — Mengisi jadwal tahap lomba

**PENTING**: Jalankan sebagai peran **postgres** (default di SQL Editor). Ini memastikan fungsi `SECURITY DEFINER` dimiliki oleh `postgres` dan bisa melewati RLS.

Jika `0005_storage.sql` gagal pada `insert into storage.buckets`, buat bucket secara manual:
- Buka **Storage** di dashboard
- Buat 3 bucket: `case-files`, `submissions`, `student-proofs` (semua **Private**)
- Lalu jalankan hanya bagian `create policy ...` dari file tersebut

## 4. Verifikasi Migrasi

Jalankan query berikut di SQL Editor dan pastikan hasilnya benar:

```sql
-- Semua tabel public harus RLS = true
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;

-- Jadwal ter-seed
select key, opens_at at time zone 'Asia/Jakarta' as opens_wib,
       closes_at at time zone 'Asia/Jakarta' as closes_wib from public.stages order by opens_at;

-- Bucket private
select id, public, file_size_limit from storage.buckets;

-- Policy terdaftar
select tablename, policyname, cmd, roles from pg_policies
where schemaname in ('public','storage') order by 1, 2;
```

## 5. Buat Akun Admin

1. Buka **Authentication → Users → Add user**.
2. Isi email admin dan password kuat. Centang **Auto Confirm User**.
3. Jalankan di SQL Editor (ganti email):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'admin@email.com'
on conflict do nothing;
```

4. Ulangi untuk setiap panitia yang perlu akses admin (2–3 orang saja).

## 6. Buat Akun Tim (Peserta)

1. Siapkan file CSV `participants.csv` dengan format:
```
email,category,payment_verified
ketua1@gmail.com,early_bird,true
ketua2@gmail.com,regular,true
```

2. Di folder `scripts/`, jalankan:
```bash
cd scripts
npm install
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node create-accounts.mjs participants.csv
```

3. File `credentials-YYYY-MM-DD.csv` akan dibuat dengan kode tim dan password. **Bagikan lewat kanal aman (bukan email/chat biasa). Hapus file setelah selesai.**

## 7. Buat Akun Uji (Staging)

Untuk testing, buat minimal 3 akun:

1. **Admin**: buat user `admin@test.com` di dashboard, lalu `insert into admins`.
2. **Tim A**: buat via CSV dengan email `teamA@test.com`.
3. **Tim B**: buat via CSV dengan email `teamB@test.com`.

Catat UUID masing-masing:
```sql
select id, email from auth.users;
select id, user_id, code from public.teams;
```

Gunakan UUID ini untuk mengisi placeholder di `docs/tests/rls-tests.sql`.

## 8. Reset Password Tim

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node reset-password.mjs email@tim.com
```

## 9. Checklist Sebelum Rilis

- [ ] Signup publik dimatikan (coba `signUp()` → harus gagal)
- [ ] Semua tabel RLS enabled
- [ ] Semua bucket private
- [ ] `service_role` key TIDAK ada di repo atau frontend
- [ ] Migrasi 0001–0007 dijalankan berurutan tanpa error
- [ ] Verifikasi query di §4 hasilnya benar
- [ ] Akun admin terdaftar di tabel `admins`
- [ ] Jalankan semua uji RLS di `docs/tests/rls-tests.sql`
