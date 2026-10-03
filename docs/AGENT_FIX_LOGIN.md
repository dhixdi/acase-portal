# AGENT_FIX_LOGIN: Diagnosa dan perbaikan akun ACASE yang tidak bisa login

Instruksi untuk AI coding agent. Kerjakan berurutan: **Fase 0 (aman) → 1 (kumpulkan data) → 2 (diagnosa) → 3 (perbaiki) → 4 (verifikasi) → 5 (rapikan repo)**. Jangan lompat ke Fase 3 sebelum Fase 2 selesai dan penyebabnya jelas.

---

## Latar belakang masalah

- Portal peserta ACASE 2026 (Supabase Auth + tabel `public.teams`).
- Akun peserta dibuat oleh fungsi SQL `public.admin_create_team()` (tombol "+ Akun Baru" di `web/src/pages/admin/AdminTeams.tsx`). Versi di repo: `supabase/migrations/0009_admin_create_team.sql`. Fungsi ini **meng-insert langsung ke `auth.users` dan `auth.identities`**.
- Riwayat gejala:
  1. Akun sampai sekitar `ACASE-035` awalnya tidak bisa login. Pernah diperbaiki oleh agent lain sehingga bisa login.
  2. Akun yang dibuat sesudahnya (sekitar `ACASE-036` s.d. `ACASE-045`, total 10 akun) **tidak bisa login lagi**. Akun lama tetap normal.
  3. Format password berbeda. Akun lama berupa hex huruf kecil 8 karakter (`ef8c74b3`). Akun baru berupa campuran huruf besar dan kecil (`riALtQSR`).
- Artinya: versi fungsi `admin_create_team` yang aktif sekarang kemungkinan **berbeda dari versi yang dulu menghasilkan akun yang berfungsi**, dan/atau fungsi hasil perbaikan lama tidak tersimpan di repo.

## Hipotesis (urut kemungkinan, WAJIB dibuktikan di Fase 2, jangan dianggap fakta)

| # | Hipotesis | Tanda khas |
|---|-----------|------------|
| H1 | Kolom token di `auth.users` bernilai `NULL` (insert manual tidak mengisinya). GoTrue gagal memindai `NULL` ke string. | Login error: `Database error querying schema` (HTTP 500) |
| H2 | Baris `auth.identities` tidak lengkap atau berbeda (mis. tanpa `email_verified`, `last_sign_in_at`, atau `provider_id` tidak cocok). | Login error `Invalid login credentials` padahal password benar |
| H3 | Password salah ketik karena karakter ambigu di base64 (`I`/`l`/`1`, `O`/`0`). | Berhasil jika password di-copy-paste dari sumber asli |
| H4 | Fungsi di database ≠ file di repo (perbaikan manual tidak pernah di-commit). | `pg_get_functiondef` berbeda dari `0009` |
| H5 | Email di `auth.users` tidak sama dengan yang dipakai login (huruf besar/kecil, spasi). | Query `lower(email)` cocok tapi `email` tidak |

## Aturan keselamatan (WAJIB)

1. **Jangan menghapus** baris di `auth.users`, `auth.identities`, atau `public.teams`. Akun yang sudah punya data biodata/submission tidak boleh hilang (FK `on delete cascade`).
2. **Jangan mengubah akun yang berfungsi** (yang sudah bisa login). Semua perubahan data dibatasi pada akun yang terbukti bermasalah.
3. Jalankan perubahan data di dalam transaksi (`begin; ... ; commit;`) dan cek hasilnya sebelum `commit`.
4. **Jangan menulis password, service role key, atau anon key ke repo, log commit, atau output yang dibagikan.** Kredensial baru hanya ditampilkan ke pengguna di akhir, dalam bentuk tabel, dan disimpan di file yang masuk `.gitignore`.
5. Jangan mengubah file selain yang tercantum di Fase 5 tanpa bertanya.
6. Jika tidak ada akses langsung ke database (hanya akses repo), **berhenti setelah menyiapkan file SQL di Fase 5** dan minta pengguna menjalankan query diagnosa di Supabase SQL Editor, lalu minta hasilnya.

## Prasyarat akses

Cari cara yang tersedia, urut preferensi: (a) Supabase MCP/CLI yang sudah terkonfigurasi, (b) `psql` dengan connection string dari pengguna, (c) tanpa akses DB → mode Fase 5 saja. Untuk tes login (Fase 4) butuh `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dari environment, jangan di-hardcode.

---

## Fase 0: Cadangkan dulu

```sql
-- Snapshot akun & fungsi sebelum menyentuh apa pun
create schema if not exists _backup;
create table if not exists _backup.auth_users_20261003 as
  select * from auth.users where email like 'acase-%@asiq.ugm.ac.id';
create table if not exists _backup.auth_identities_20261003 as
  select * from auth.identities
  where user_id in (select id from auth.users where email like 'acase-%@asiq.ugm.ac.id');
create table if not exists _backup.teams_20261003 as select * from public.teams;
```

Jika `create schema` ditolak karena izin, minta pengguna mengekspor tabel lewat dashboard, lalu lanjut.

## Fase 1: Kumpulkan data

### 1.1 Riwayat di repo

```bash
git log --oneline --follow -- supabase/migrations/0009_admin_create_team.sql
git log --oneline -20 -- supabase scripts
git log -p --all -S"auth.users" -- supabase scripts | head -200
ls supabase/migrations
```

Catat apakah ada migrasi/commit yang memperbaiki login akun lama (mis. mengisi kolom token, `UPDATE auth.users`). Perbaikan itu mungkin dilakukan sekali lewat SQL Editor dan **tidak ada di repo**.

### 1.2 Daftar akun dan kelompokkan

```sql
select t.code, t.login_email, t.created_at, u.id is not null as has_auth_user
from public.teams t
left join auth.users u on u.id = t.user_id
where t.code ~ '^ACASE-[0-9]+$'
order by t.code;
```

Tentukan: **akun referensi yang berfungsi** (mis. `ACASE-030`) dan **akun bermasalah** (mis. `ACASE-040`). Konfirmasi ke pengguna jika batas nomor tidak jelas. Nomor kode dan urutan pembuatan di `created_at` jadi patokan.

### 1.3 Definisi fungsi yang aktif

```sql
select pg_get_functiondef('public.admin_create_team'::regproc);
```

Bandingkan dengan `supabase/migrations/0009_admin_create_team.sql`.

### 1.4 Daftar kolom `auth.users` pada versi Supabase ini

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'auth' and table_name in ('users','identities')
order by table_name, ordinal_position;
```

Jangan mengasumsikan nama kolom. Versi GoTrue berbeda punya kolom berbeda. Semua SQL perbaikan di bawah **hanya boleh memakai kolom yang muncul di hasil ini**.

---

## Fase 2: Diagnosa

### 2.1 Bandingkan baris `auth.users` (akun berfungsi vs bermasalah)

Ganti email sesuai Fase 1.2.

```sql
select
  email,
  email = lower(btrim(email))                         as email_clean,
  left(encrypted_password, 4)                         as hash_prefix,   -- harus $2a$ atau $2b$
  length(encrypted_password)                          as hash_len,      -- normalnya 60
  email_confirmed_at is not null                      as confirmed,
  aud, role, instance_id,
  confirmation_token         is null as confirmation_token_null,
  recovery_token             is null as recovery_token_null,
  email_change               is null as email_change_null,
  email_change_token_new     is null as email_change_token_new_null,
  email_change_token_current is null as email_change_token_current_null,
  phone_change               is null as phone_change_null,
  phone_change_token         is null as phone_change_token_null,
  reauthentication_token     is null as reauthentication_token_null,
  raw_app_meta_data, raw_user_meta_data,
  is_sso_user, is_anonymous, banned_until, deleted_at
from auth.users
where email in ('acase-030@asiq.ugm.ac.id','acase-040@asiq.ugm.ac.id');
```

Hapus kolom yang tidak ada di Fase 1.4 jika query error.

**Interpretasi:** kolom `*_null` yang `true` di akun bermasalah tetapi `false` di akun berfungsi → **H1 terbukti**.

### 2.2 Bandingkan `auth.identities`

```sql
select u.email, i.provider, i.provider_id, i.identity_data,
       i.last_sign_in_at is null as last_sign_in_null, i.created_at
from auth.identities i
join auth.users u on u.id = i.user_id
where u.email in ('acase-030@asiq.ugm.ac.id','acase-040@asiq.ugm.ac.id');
```

Perhatikan: apakah `identity_data` akun berfungsi memuat `email_verified`/`phone_verified` sedangkan yang bermasalah hanya `sub` dan `email`; apakah `provider_id` sama dengan `user_id::text` (untuk provider `email`) atau sama dengan email. Ikuti pola akun yang berfungsi → **H2** jika berbeda.

Cek juga akun yang tidak punya identity sama sekali:

```sql
select u.email from auth.users u
left join auth.identities i on i.user_id = u.id
where u.email like 'acase-%@asiq.ugm.ac.id' and i.id is null;
```

### 2.3 Cek konsistensi `teams` ↔ `auth.users`

```sql
select t.code, t.login_email, u.email,
       t.login_email is distinct from u.email as email_mismatch
from public.teams t join auth.users u on u.id = t.user_id
where t.login_email is distinct from u.email;
```

Hasil kosong = normal. Ada baris = **H5**.

### 2.4 Tes login nyata terhadap Auth API (membedakan H1/H2/H3)

Butuh satu akun bermasalah dan password aslinya (dari pengguna). Jangan tulis password di file.

```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"acase-040@asiq.ugm.ac.id\",\"password\":\"$TEST_PASSWORD\"}"
```

| Respons | Arti |
|---------|------|
| `access_token` ada | Akun ini sebenarnya sehat. Masalahnya H3 (salah ketik) atau frontend. Lanjut 2.6 |
| `Database error querying schema` / HTTP 500 | **H1** (kolom token NULL) atau kolom wajib lain kosong |
| `Invalid login credentials` + password pasti benar | **H2** atau hash tidak cocok. Lihat 2.5 |
| `Email not confirmed` | `email_confirmed_at` kosong, perbaiki di Fase 3 |

### 2.5 Verifikasi hash password

Hanya jika password asli diketahui. Jalankan di dalam sesi SQL, **jangan di-log permanen**:

```sql
select email, encrypted_password = extensions.crypt('PASSWORD_ASLI', encrypted_password) as pw_match
from auth.users where email = 'acase-040@asiq.ugm.ac.id';
```

`pw_match = false` padahal password dicatat benar → hash di DB tidak sesuai password yang diberikan ke peserta (mis. fungsi menampilkan password yang beda dari yang di-hash). Itu bug di fungsi, lihat Fase 3C.

### 2.6 Cek sisi frontend

`web/src/pages/Login.tsx` mengubah input menjadi lowercase dan menambah `@asiq.ugm.ac.id` jika tanpa `@`; password di-`trim()`. Sementara debugging, tampilkan pesan error asli supaya tidak tertutup "Username atau password salah":

```tsx
if (error) {
  console.error(error);
  setError('Gagal masuk: ' + error.message);   // kembalikan ke pesan umum setelah selesai
}
```

### 2.7 Kesimpulan diagnosa

Tulis ringkasan satu paragraf: hipotesis mana yang terbukti, bukti (hasil query/curl), dan daftar akun terdampak. **Berhenti dan tanyakan ke pengguna jika bukti tidak konsisten atau penyebabnya di luar H1 sampai H5.**

---

## Fase 3: Perbaikan

Kerjakan hanya cabang yang sesuai diagnosa. Semua dalam transaksi.

### 3A. Perbaiki H1: kolom token NULL (akun terdampak)

Gunakan **hanya kolom yang ada** (Fase 1.4). Batasi ke akun bermasalah. Contoh untuk `ACASE-036` ke atas:

```sql
begin;

update auth.users u set
  confirmation_token         = coalesce(u.confirmation_token, ''),
  recovery_token             = coalesce(u.recovery_token, ''),
  email_change               = coalesce(u.email_change, ''),
  email_change_token_new     = coalesce(u.email_change_token_new, ''),
  email_change_token_current = coalesce(u.email_change_token_current, ''),
  phone_change               = coalesce(u.phone_change, ''),
  phone_change_token         = coalesce(u.phone_change_token, ''),
  reauthentication_token     = coalesce(u.reauthentication_token, '')
from public.teams t
where t.user_id = u.id
  and t.code ~ '^ACASE-[0-9]+$'
  and substring(t.code from 7)::int >= 36;        -- sesuaikan batas dari Fase 1.2

-- cek: harus 0 baris
select email from auth.users
where email like 'acase-%@asiq.ugm.ac.id'
  and (confirmation_token is null or recovery_token is null or email_change is null
       or email_change_token_new is null or email_change_token_current is null
       or phone_change is null or phone_change_token is null or reauthentication_token is null);

commit;   -- rollback; jika cek tidak 0
```

Jika ada kolom yang tidak ada di database, hapus barisnya dari `update` dan dari `select` cek.

### 3B. Perbaiki H2: `auth.identities`

Samakan akun bermasalah dengan pola akun berfungsi (hasil 2.2). Contoh umum:

```sql
begin;

update auth.identities i set
  identity_data = i.identity_data
                  || jsonb_build_object('email_verified', true, 'phone_verified', false),
  last_sign_in_at = coalesce(i.last_sign_in_at, now())
from auth.users u
join public.teams t on t.user_id = u.id
where i.user_id = u.id
  and t.code ~ '^ACASE-[0-9]+$' and substring(t.code from 7)::int >= 36;

-- akun tanpa identity: buat (sesuaikan kolom dengan Fase 1.4 dan pola akun berfungsi)
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
from auth.users u
left join auth.identities i on i.user_id = u.id
where u.email like 'acase-%@asiq.ugm.ac.id' and i.id is null;

commit;
```

**Cocokkan `provider_id` dengan akun yang berfungsi** (hasil 2.2). Jika akun berfungsi memakai email sebagai `provider_id`, ikuti itu, jangan `u.id::text`.

### 3C. Perbaiki H3/hash: password tidak cocok atau ambigu

Jika `pw_match = false`, atau pengguna tidak punya catatan password yang andal, **reset password akun terdampak** dengan password baru tanpa karakter ambigu. Karakter yang dipakai: `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789` (sama dengan `scripts/create-accounts.mjs`).

Cara paling aman: pakai Admin API lewat skrip, bukan SQL.

```bash
cd scripts && npm install
# env SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY diberikan pengguna, JANGAN ditulis ke file
node reset-password.mjs acase-040@asiq.ugm.ac.id
```

Untuk banyak akun, buat loop di shell atau skrip sementara yang **menulis kredensial hanya ke `credentials-*.csv`** (sudah dikecualikan dari commit, pastikan masuk `.gitignore`). Catatan: `reset-password.mjs` mengisi `must_change_password: true` di metadata. Pastikan frontend tidak memblokir login karena flag itu (cari `must_change_password` di `web/src`; jika tidak dipakai, tidak berdampak).

Alternatif SQL (hanya bila Admin API tidak mungkin):

```sql
update auth.users
set encrypted_password = extensions.crypt('PASSWORD_BARU', extensions.gen_salt('bf')),
    updated_at = now()
where email = 'acase-040@asiq.ugm.ac.id';
```

### 3D. Perbaiki H5: email tidak konsisten

```sql
begin;
update auth.users u set email = lower(btrim(u.email))
where u.email <> lower(btrim(u.email)) and u.email like '%@asiq.ugm.ac.id';
update public.teams t set login_email = u.email
from auth.users u where u.id = t.user_id and t.login_email is distinct from u.email;
commit;
```

### 3E. Perbaiki sumber masalah: fungsi `admin_create_team` (H4, wajib agar akun berikutnya tidak rusak)

Buat migrasi baru `supabase/migrations/0012_fix_admin_create_team.sql`. Pertahankan struktur `0009` (cek admin, penomoran `ACASE-0xx`, insert `auth.users`, `auth.identities`, `public.teams`, return JSON `username` dan `password`), dengan perubahan:

1. **Isi semua kolom token** dengan `''` pada insert `auth.users` (hanya kolom yang ada di Fase 1.4).
2. **Identity lengkap**: `identity_data` memuat `sub`, `email`, `email_verified: true`, `phone_verified: false`; isi `last_sign_in_at`, `created_at`, `updated_at`; `provider_id` mengikuti pola akun yang berfungsi.
3. **Password tanpa karakter ambigu**, 8 s.d. 10 karakter, dibuat dengan `gen_random_bytes` + alfabet di atas (atau hex huruf kecil seperti format lama), dan **hash dihitung dari string yang sama persis dengan yang dikembalikan** ke admin.
4. Gunakan `jsonb_build_object` untuk `identity_data`, bukan `format('{"sub":"%s",...}')`.
5. Pertahankan `security definer`, `set search_path = public`, dan grant/revoke yang sama dengan `0009`:

```sql
revoke all on function public.admin_create_team() from public;
grant execute on function public.admin_create_team() to authenticated;
```

Kerangka bagian kunci (sesuaikan dengan hasil Fase 1.3 dan 1.4):

```sql
-- password: 10 karakter dari alfabet tanpa karakter ambigu
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  v_bytes bytea := extensions.gen_random_bytes(10);
begin
  v_password := '';
  for i in 0..9 loop
    v_password := v_password || substr(v_alphabet, (get_byte(v_bytes, i) % length(v_alphabet)) + 1, 1);
  end loop;
  v_encrypted_password := extensions.crypt(v_password, extensions.gen_salt('bf'));
  -- insert auth.users: tambahkan confirmation_token, recovery_token, email_change,
  -- email_change_token_new, email_change_token_current, phone_change, phone_change_token,
  -- reauthentication_token  => ''   (hanya yang ada di database)
  -- insert auth.identities: identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_email,
  --                         'email_verified', true, 'phone_verified', false), last_sign_in_at = now()
  ...
```

Bias modulo kecil (256 mod 54) dapat diabaikan untuk kasus ini.

---

## Fase 4: Verifikasi

1. **Tes login API** untuk minimal 3 akun yang diperbaiki (satu per kelompok) dan 1 akun lama yang berfungsi (kontrol, harus tetap berhasil):

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
     -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
     -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}"
   ```

   Harus `200` untuk semuanya.
2. **Tes buat akun baru** lewat fungsi yang sudah diperbaiki (tombol "+ Akun Baru" di panel admin, atau `select public.admin_create_team();` dari sesi admin). Login dengan akun baru itu harus langsung `200`. Akun uji ini boleh dihapus lewat fitur "Hapus Tim" di panel admin (`admin_delete_team`) setelah terverifikasi.
3. **Tes frontend**: login lewat UI dengan username `ACASE-0xx` (tanpa domain), arah ke Dashboard, `my_status` memuat tim.
4. **Cek regresi**: jumlah baris `public.teams` sama seperti sebelum Fase 3; tidak ada baris `auth.users` yang hilang dibanding `_backup`.
5. Jika ada akun yang masih gagal, kembali ke Fase 2.4 untuk akun itu dan catat pesan error yang berbeda.

## Fase 5: Rapikan repo

File yang boleh dibuat/diubah:

- `supabase/migrations/0012_fix_admin_create_team.sql`: versi fungsi final (Fase 3E).
- `supabase/migrations/0013_repair_broken_accounts.sql` (opsional): SQL perbaikan data satu kali dari Fase 3A, 3B, 3D, supaya riwayat perbaikan terdokumentasi. **Tanpa password atau data pribadi.**
- `web/src/pages/Login.tsx`: **opsional dan hanya jika pengguna setuju**, pesan error yang lebih informatif (jangan membocorkan detail teknis ke peserta; cukup bedakan "kredensial salah" dari "gagal terhubung/server bermasalah").
- `.gitignore`: pastikan `credentials-*.csv` dan `scripts/node_modules` terkecualikan.

Commit:

```bash
git add supabase/migrations/0012_fix_admin_create_team.sql supabase/migrations/0013_repair_broken_accounts.sql .gitignore
git commit -m "fix: admin_create_team fills auth token columns and identity data; repair broken accounts"
```

Jangan push sebelum pengguna meninjau. Migrasi ini harus **dijalankan juga di database produksi** (SQL Editor Supabase atau `supabase db push`), karena push ke GitHub hanya men-deploy frontend.

## Laporan akhir ke pengguna

Sajikan ringkas:

1. Penyebab yang terbukti (hipotesis mana, buktinya).
2. Akun apa saja yang diperbaiki (kode saja) dan apa yang diubah.
3. Tabel kredensial baru **hanya untuk akun yang passwordnya direset** (kode, email, password), dengan peringatan agar langsung dibagikan ke peserta lewat jalur aman dan file CSV tidak dibagikan sembarangan.
4. Status verifikasi Fase 4 (angka berhasil/gagal).
5. Hal yang belum bisa dipastikan atau perlu tindakan manual pengguna (mis. menjalankan migrasi di produksi).
