# 04 — Panel Admin

Bagian dari aplikasi `web/` yang sama, di rute `/admin/*`, **di-lazy-load** (`React.lazy`) supaya tidak membebani bundle peserta. Semua akses data memakai `anon key` + sesi admin; **keamanan ditegakkan oleh RLS** (policy `*_admin` pada tiap tabel). Panel admin **tidak boleh** memakai `service_role`.

Pembuatan akun tim dan reset password dilakukan lewat **skrip lokal** (`02-backend-supabase.md` bagian 9). Membuat akun dari UI (Edge Function) adalah fitur opsional, lihat bagian 11.

## 1. Rute dan navigasi

Layout: sidebar kiri (collapsible di mobile) + konten. Guard `RequireAdmin`.

| Rute | Halaman | Prioritas | Fase |
|---|---|---|---|
| `/admin` | Dashboard ringkas | SHOULD | 2 |
| `/admin/teams` | Daftar tim | MUST | 1–2 |
| `/admin/teams/:id` | Detail tim | MUST | 2 |
| `/admin/schedule` | Jadwal tahap | MUST | 1 |
| `/admin/case-materials` | Materi case | MUST | 1 |
| `/admin/submissions` | Monitoring + ZIP (case) | MUST | 2 |
| `/admin/announcements` | Pengumuman | MUST | 2 |
| `/admin/finalists` | Finalis + publikasi | MUST | 3 |
| `/admin/pitch-decks` | Monitoring + ZIP (pitch deck) | MUST | 3 |
| `/admin/audit` | Audit log | SHOULD | 3 |

Untuk Fase 1 (sebelum 2 Okt) cukup: Jadwal + Materi case + Daftar tim. Pekerjaan lain di dashboard Supabase (Table Editor) dapat menggantikan sementara.

## 2. Pola umum

- Tabel dengan pencarian teks, sortir, filter, paginasi sisi klien (skala ≤ ~200 baris, boleh ambil semua).
- Tindakan destruktif (hapus, nonaktifkan, publikasi finalis) selalu lewat **dialog konfirmasi**; yang paling berisiko (publikasi finalis) meminta mengetik kata `PUBLIKASI`.
- Setiap tulis penting menambah baris `audit_log` (`insert` dengan `actor = auth.uid()`): `team_updated`, `schedule_changed`, `override_set`, `finalists_published`, `announcement_created`, `case_material_added`, `zip_downloaded`, dll. Cukup `action`, `entity`, `entity_id`, `details`.
- Semua waktu tampil WIB. Input tanggal memakai `datetime-local` dan **dikonversi ke `timestamptz` dengan offset `+07:00`** (jangan memakai zona waktu perangkat).
- Toast sukses/gagal; skeleton loading.

## 3. Dashboard (`/admin`)

Kartu angka (dari `admin_team_overview`):
- Total akun tim, Biodata lengkap / belum, Akun nonaktif.
- Sudah submit case / belum (dan persentase).
- Finalis (ditandai / dipublikasikan) dan pitch deck masuk.
- Tahap aktif saat ini dan sisa waktu ke deadline umum.

Daftar cepat: "Tim yang belum melengkapi biodata" dan "Tim belum submit" (menjelang deadline), masing-masing dengan tombol salin kontak ketua (WhatsApp) dan ekspor CSV.

## 4. Daftar tim (`/admin/teams`)

Sumber: `from('admin_team_overview').select('*')`.

Kolom: Kode, Nama kelompok, Kampus, Ketua, WhatsApp ketua, Jumlah anggota, Kategori, Bayar terverifikasi, Biodata (✓/—), Case submit (waktu), Finalis, Aktif.

Fitur:
- Pencarian (kode, nama, kampus, nama ketua, email login).
- Filter: biodata belum lengkap, sudah/belum submit, finalis, nonaktif, kategori, kampus.
- **Ekspor CSV biodata** (satu baris per anggota): ambil `team_members` join `teams` (dua query lalu gabung di klien). Kolom: kode tim, nama kelompok, kategori, no anggota, ketua?, nama, NIM, kampus, prodi, jenjang, angkatan, email, WhatsApp. **Tambahkan BOM UTF-8** (`\uFEFF`) agar terbuka benar di Excel. Nama file `biodata-acase-YYYYMMDD.csv`.
- Klik baris → detail tim.

## 5. Detail tim (`/admin/teams/:id`)

Bagian:
1. **Info akun**: kode, email login, kategori, dibuat kapan. Tombol "Salin instruksi reset password" (menampilkan perintah `node reset-password.mjs {email}`; reset tetap dilakukan lokal).
2. **Status**: toggle `is_active`, toggle `payment_verified`, select `category` → `update teams`. Konfirmasi saat menonaktifkan.
3. **Biodata**: tim + anggota (read-only, tampil rapi). Tombol "Salin ringkasan" ke clipboard. *(MAY: edit oleh admin lewat form yang sama dengan peserta; karena RPC peserta memakai `auth.uid()`, edit admin harus lewat update tabel langsung yang diizinkan policy admin.)*
4. **Bukti mahasiswa aktif**: tautan unduh (signed URL) bila ada.
5. **Submission**: untuk tiap tahap tampilkan status, nama file asli, ukuran, waktu; tombol **Unduh** (signed URL 60 detik, nama unduhan `Nama Kelompok.pdf`).
6. **Override deadline**: tabel `deadline_overrides` tim ini; form tambah/ubah/hapus (`stage`, `closes_at`, `note`). Tampilkan deadline efektif dibanding deadline umum.
7. **Catatan internal**: textarea → upsert `team_admin_notes`.
8. **Riwayat unggahan**: dari `submission_events` (waktu, aksi, ukuran).
9. **Finalis**: status ditandai/dipublikasikan (aksi ada di halaman Finalis).

## 6. Jadwal (`/admin/schedule`)

Tiga kartu (`case_release`, `case_submission`, `pitch_deck`), masing-masing: `opens_at`, `closes_at` (boleh kosong untuk `case_release`). Validasi `closes_at > opens_at`. Simpan → `update stages`. Tampilkan peringatan jika mengubah `closes_at` ke masa lalu ("tahap akan langsung tertutup untuk semua tim").

Tampilkan juga pratinjau "Sekarang menurut server: …" (dari `server_now`).

## 7. Materi case (`/admin/case-materials`)

- Daftar materi (judul, nama file, ukuran, urutan).
- **Tambah**: judul, deskripsi, file (PDF/ZIP/CSV/XLSX ≤ 50 MB). Upload ke `case-files/{crypto.randomUUID()}-{namaFileAman}` lalu `insert case_materials`.
- Ubah judul/deskripsi/urutan (tombol naik/turun), **hapus** (hapus objek storage, lalu baris).
- Tombol "Pratinjau/unduh" untuk admin (bisa kapan saja).
- Kartu peringatan: "File ini akan otomatis terkunci untuk peserta sampai {opens_at case_release}."
- Sarankan agar file diunggah **sebelum** waktu rilis (RLS mencegah kebocoran).

## 8. Monitoring submission (`/admin/submissions`, dan `/admin/pitch-decks`)

Satu komponen `SubmissionsAdmin` dengan prop `stage` (`case_submission` atau `pitch_deck`). Untuk pitch deck, daftar dibatasi ke tim finalis.

**Tabel:** Kode · Nama kelompok · Status (Sudah/Belum) · Waktu submit (WIB) · Ukuran · Deadline efektif (jika ada override tampil badge) · Aksi (Unduh).

Sumber data: `admin_team_overview` + `submissions` (untuk `file_path`, `file_name`).

**Filter cepat:** Hanya yang belum submit, hanya yang sudah, terlambat/diperpanjang.

**Tombol utama:** **Unduh semua (ZIP)**.

### Spesifikasi ZIP (`Nama Kelompok.pdf`)

Opsi di dialog sebelum mengunduh:

| Opsi | Default |
|---|---|
| Mode penamaan | `Nama kelompok` (mis. `Tim Kuartil.pdf`) atau `Kode tim` (mis. `ACASE-007.pdf`, untuk juri/blind) |
| Sertakan manifest CSV (`_manifest.csv`) | **Mati** |

Algoritma (klien, `jszip`, di-import dinamis):

1. Ambil semua baris `submissions` untuk `stage` + `slot='main'` bergabung dengan `teams` (nama, kode). Hanya tim yang sudah submit.
2. Bangun nama file:
   - mode nama: `sanitize(team.name) + '.pdf'`; mode kode: `team.code + '.pdf'`.
   - `sanitize`: ganti `[\\/:*?"<>|]` → `-`, hilangkan karakter kontrol, rapikan spasi berulang, trim spasi/titik di ujung, potong 100 karakter, jika kosong pakai kode tim.
   - **Cegah duplikat** (nama beda huruf besar/kecil dianggap sama pada Windows): jika bentrok, tambahkan ` (ACASE-007)` sebelum `.pdf`.
3. Unduh tiap file dengan `supabase.storage.from('submissions').download(file_path)`, **konkurensi 4**, dengan progres "n / total". Gagal satu file tidak menghentikan proses; kumpulkan daftar galat dan tampilkan di akhir (juga sebagai `_ERRORS.txt` di dalam ZIP bila ada).
4. `zip.file(namaFile, blob)`; kompresi `STORE` (PDF sudah terkompres) agar cepat.
5. `zip.generateAsync({ type: 'blob', streamFiles: true })` → unduh sebagai `acase-{stage}-{YYYYMMDD-HHmm}.zip`.
6. Tulis `audit_log` (`zip_downloaded`, jumlah file, mode).
7. Manifest (bila dicentang): `kode,nama kelompok,waktu submit WIB,ukuran (byte),nama file asli`.

Peringatan UI: "ZIP dibuat di browser Anda. Untuk > 150 file atau jaringan lambat, gunakan komputer dengan koneksi stabil."

## 9. Pengumuman (`/admin/announcements`)

- Daftar semua (termasuk draft) dengan badge: Draft/Terjadwal/Terbit, audiens, pin.
- Form: judul, isi (**Markdown**, dengan pratinjau langsung memakai komponen `Markdown` yang sama), audiens (`public` / `participants` / `finalists`), `pinned`, `is_published`, `published_at` (default sekarang; boleh masa depan = terjadwal).
- Aksi: Buat, Ubah, Hapus (konfirmasi), Terbit/Tarik.
- Peringatan saat audiens `public` ("Akan terlihat oleh siapa saja tanpa login").

## 10. Finalis (`/admin/finalists`) — Fase 3

Tujuan: menyiapkan daftar finalis **tanpa langsung tampil**, lalu mempublikasikannya serentak.

- Kiri: semua tim (filter/pencarian) dengan checkbox → tombol "Tandai sebagai finalis" (`insert into finalists (team_id, published=false)`), dan "Cabut" (`delete`).
- Kanan: daftar finalis saat ini dengan status Draft/Terpublikasi.
- **Publikasikan:** tombol memunculkan dialog: ringkasan jumlah tim, konfirmasi mengetik `PUBLIKASI`, opsi "Buat pengumuman otomatis untuk finalis (audiens: finalists) dan publik". Lalu `update finalists set published = true`. Audit log `finalists_published`.
- **Tarik publikasi** (`published=false`) tersedia untuk koreksi.
- Setelah publikasi: tautan cepat ke halaman Pengumuman publik untuk memastikan tampilan.
- Perhatikan: `pitch_deck` hanya bisa dikirim finalis **terpublikasi**; tahap `pitch_deck` juga mengikuti jadwal di `/admin/schedule`.

## 11. Opsional: buat akun tim dari UI (Edge Function)

Hanya jika diminta. Rancangan:
- Edge Function `admin-create-team` (Deno) menerima `{ email, category, payment_verified }`.
- Verifikasi JWT pemanggil dan pastikan ia ada di `admins` (query dengan klien `service_role` **di dalam fungsi**, bukan di klien).
- Buat user (`auth.admin.createUser`, `email_confirm: true`, password acak), insert `teams`, kembalikan kode + password **sekali** untuk disalin admin.
- Ada rate limit dan audit log. `service_role` hanya sebagai secret Edge Function.

Default proyek: **tidak dikerjakan**, skrip lokal sudah cukup.

## 12. Audit log (`/admin/audit`)

Tabel `audit_log` terbaru dulu: waktu, aktor (email dari peta admin bila tersedia, jika tidak UUID), aksi, entitas, detail (JSON ringkas). Filter aksi dan rentang tanggal. Read-only.

## 13. Keamanan panel admin

- Semua kueri admin hanya berhasil karena `is_admin()` di RLS; uji bahwa peserta memanggil kueri yang sama mendapat kosong/ditolak.
- **MAY (Fase 3):** wajibkan MFA TOTP untuk admin: aktifkan MFA di Supabase Auth, halaman pendaftaran/verifikasi TOTP di panel, dan (opsional) perketat `is_admin()` dengan `(auth.jwt() ->> 'aal') = 'aal2'`. Lakukan hanya bila panitia sudah menyiapkan authenticator; jangan sampai admin terkunci.
- Tidak ada penampilan `service_role`, password peserta, atau hash di UI.
- Sesi admin timeout otomatis mengikuti sesi Supabase; sediakan tombol Keluar yang jelas.

## 14. Definition of Done — panel admin

- [ ] Rute admin ditolak untuk non-admin (UI **dan** data).
- [ ] Daftar tim, filter, ekspor CSV berfungsi (Excel membuka karakter Indonesia dengan benar).
- [ ] Detail tim: ubah status, catatan, override deadline (terlihat berubah di sisi tim), unduh file.
- [ ] Jadwal: ubah waktu memakai WIB dengan benar (uji: set `closes_at` = 5 menit lagi dan buktikan upload ditolak setelahnya).
- [ ] Materi case: unggah sebelum rilis tetap tidak bisa diambil peserta sampai `opens_at`.
- [ ] ZIP: nama file `Nama Kelompok.pdf` bersih, tanpa duplikat, mode kode tim bekerja, progres tampil, galat per file dilaporkan.
- [ ] Pengumuman: audiens dan penjadwalan tampil benar di sisi peserta/publik.
- [ ] Finalis: tandai → belum tampil publik; publikasi → tampil; tarik → hilang.
- [ ] Audit log mencatat aksi utama.
