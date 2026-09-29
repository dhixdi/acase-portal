# 01 — Product Requirements (PRD)

Kata kunci: **MUST** = wajib, **SHOULD** = sangat disarankan, **MAY** = opsional.
ID requirement (mis. `FR-BIO-3`) dipakai untuk melacak di pengujian.

## 1. Aktor

| Aktor | Cara masuk | Hak |
|---|---|---|
| **Pengunjung publik** | Tanpa login | Melihat pengumuman berstatus *public* dan daftar finalis yang sudah dipublikasikan |
| **Peserta (tim)** | Akun **dibuat panitia**, 1 akun per tim | Mengelola biodata timnya, unduh case, submit jawaban, lihat pengumuman peserta, (finalis) submit pitch deck |
| **Admin (panitia)** | Akun dibuat manual + terdaftar di tabel `admins` | Semua fungsi manajemen |

Tidak ada pendaftaran mandiri. Satu akun mewakili satu tim; ketua tim memegang kredensial.

## 2. Ruang lingkup

**Masuk:** login, biodata tim, case release, case submission, pengumuman, finalis, pitch deck, panel admin, ekspor data, ZIP submission, override deadline, audit log.

**Tidak masuk:** pembayaran, pendaftaran lomba (tetap via Google Form/bit.ly yang ada), penjurian/penilaian, chat, notifikasi email otomatis (opsional bila SMTP ada), lomba lain (Olympiad, Infographics).

## 3. Tahap lomba (stages)

Tiga tahap disimpan di tabel `stages`, dengan `opens_at` dan `closes_at` yang bisa diubah admin.

| key | Arti | Buka | Tutup |
|---|---|---|---|
| `case_release` | Peserta boleh mengunduh materi case | 2 Okt 2026 08:00 WIB | — (tidak ditutup) |
| `case_submission` | Peserta boleh upload jawaban | 2 Okt 2026 08:00 WIB | 29 Okt 2026 23:59:59 WIB |
| `pitch_deck` | Finalis boleh upload pitch deck | 21 Nov 2026 00:00 WIB | 26 Nov 2026 23:59:59 WIB |

Setiap tim dapat punya **override deadline** (`deadline_overrides`) yang menggantikan `closes_at` bawaan tahap untuk tim itu saja.

## 4. Fitur peserta

### 4.1 Autentikasi
- **FR-AUTH-1 (MUST)** Login email + password. Tidak ada tombol daftar.
- **FR-AUTH-2 (MUST)** Semua halaman peserta terkunci sampai login. Pengunjung tak login hanya melihat Login dan Pengumuman publik.
- **FR-AUTH-3 (MUST)** Akun nonaktif (`is_active=false`) tidak bisa mengakses data apa pun; tampilkan pesan "Akun dinonaktifkan, hubungi panitia".
- **FR-AUTH-4 (MUST)** Logout. Sesi bertahan saat refresh.
- **FR-AUTH-5 (SHOULD)** Ganti password dari halaman Profil (min. 8 karakter).
- **FR-AUTH-6 (MAY)** Paksa ganti password saat login pertama (`user_metadata.must_change_password`).
- **FR-AUTH-7 (MAY)** Reset password via email jika `VITE_ENABLE_PASSWORD_RESET=true` dan SMTP dipasang.

### 4.2 Biodata tim
- **FR-BIO-1 (MUST)** Form: **nama kelompok**, **jumlah anggota (2 atau 3)**, lalu kartu anggota sebanyak jumlah itu.
- **FR-BIO-2 (MUST)** Field per anggota (semua wajib):

  | Field | Aturan |
  |---|---|
  | Nama lengkap | 2–100 karakter |
  | NIM | 3–30 karakter, alfanumerik |
  | Asal kampus | teks bebas 2–100 |
  | Program studi | teks bebas 2–100 |
  | Jenjang | pilihan `D3` / `D4` / `S1` |
  | Angkatan | 4 digit (mis. 2023) |
  | Email | format email valid |
  | No. WhatsApp | `+62…` atau `08…`, 9–15 digit (disimpan sebagai angka dengan `+` opsional) |
  | Ketua tim | tepat **satu** anggota bertanda ketua |

- **FR-BIO-3 (MUST)** Checkbox persetujuan ketentuan lomba dan penggunaan data pribadi wajib dicentang; waktu persetujuan disimpan (`consent_at`).
- **FR-BIO-4 (MUST)** Simpan lewat **satu RPC** `save_team_biodata` (transaksional). Tidak ada penulisan langsung ke tabel oleh peserta.
- **FR-BIO-5 (MUST)** Nama kelompok unik tanpa membedakan huruf besar/kecil; pesan error jelas bila bentrok.
- **FR-BIO-6 (MUST)** Biodata dapat diedit sampai deadline `case_submission` efektif tim. Sesudahnya form menjadi read-only.
- **FR-BIO-7 (SHOULD)** Upload bukti mahasiswa aktif (opsional).
- **FR-BIO-8 (SHOULD)** Simpan draft di browser (state form) agar tidak hilang bila tab tertutup; **tidak** menyimpan ke server sebelum submit.

### 4.3 Case Release
- **FR-CASE-1 (MUST)** Menu "Case Release" tampil untuk peserta login.
- **FR-CASE-2 (MUST)** Sebelum `case_release.opens_at`: tampilkan countdown dan pesan terkunci. **File tidak boleh bisa diambil** (ditegakkan RLS storage).
- **FR-CASE-3 (MUST)** Jika biodata belum lengkap: tampilkan pesan dan tombol menuju halaman Biodata; file tidak bisa diunduh.
- **FR-CASE-4 (MUST)** Setelah rilis dan biodata lengkap: daftar materi (judul, deskripsi, ukuran) dengan tombol unduh. Unduhan memakai signed URL berumur pendek (≤ 60 detik).

### 4.4 Case Submission
- **FR-SUB-1 (MUST)** Upload **PDF** maks 10 MB. Validasi ekstensi, MIME, dan header `%PDF-`.
- **FR-SUB-2 (MUST)** Hanya bisa saat tahap terbuka (efektif per tim) dan biodata lengkap; ditegakkan RLS.
- **FR-SUB-3 (MUST)** Upload ulang menimpa file sebelumnya sampai deadline. Path tetap `{team_id}/case_submission/main.pdf`.
- **FR-SUB-4 (MUST)** Setelah berhasil tampilkan **bukti**: nama file asli, ukuran, waktu upload (WIB, dari server), status "Terkirim".
- **FR-SUB-5 (MUST)** Tampilkan deadline efektif dan countdown; setelah deadline tombol upload nonaktif dengan pesan jelas.
- **FR-SUB-6 (MAY)** Slot lampiran opsional `attachment.zip` (dimatikan default).
- **FR-SUB-7 (MUST)** Setiap upload/timpa/hapus tercatat di `submission_events`.

### 4.5 Pengumuman
- **FR-ANN-1 (MUST)** Halaman Pengumuman: daftar berurut terbaru, yang *pinned* di atas. Isi berformat Markdown (tanpa HTML mentah).
- **FR-ANN-2 (MUST)** Audiens: `public` (semua), `participants` (peserta login), `finalists` (finalis terpublikasi). Difilter oleh RLS.
- **FR-ANN-3 (MUST)** Bagian "Finalis" menampilkan daftar dari view `public_finalists` (kode, nama tim, kampus) **hanya** jika sudah dipublikasikan.

### 4.6 Pitch Deck
- **FR-PIT-1 (MUST)** Menu Pitch Deck terlihat oleh semua peserta tetapi **terkunci** untuk non-finalis dengan pesan netral.
- **FR-PIT-2 (MUST)** Untuk finalis terpublikasi dan tahap terbuka: mekanisme sama dengan Case Submission (komponen dipakai ulang), path `{team_id}/pitch_deck/main.pdf`.
- **FR-PIT-3 (MUST)** Non-finalis tidak dapat upload walau memanggil API langsung (RLS).

### 4.7 Dashboard
- **FR-DASH-1 (MUST)** Checklist status: Biodata, Case diunduh (opsional), Submission, dan (finalis) Pitch Deck.
- **FR-DASH-2 (MUST)** Kartu "Tenggat berikutnya" dengan countdown berbasis **jam server** (bukan jam perangkat).
- **FR-DASH-3 (SHOULD)** Pratinjau pengumuman terbaru dan tombol bantuan WhatsApp panitia.

## 5. Fitur admin

Detail lengkap di `04-admin-panel.md`. Ringkasan:

| ID | Fitur | Prioritas |
|---|---|---|
| FR-ADM-1 | Login admin, guard rute `/admin/*` | MUST |
| FR-ADM-2 | Daftar tim + pencarian/filter + status biodata/submission | MUST |
| FR-ADM-3 | Detail tim: biodata, anggota, status, catatan internal, aktif/nonaktif, verifikasi pembayaran | MUST |
| FR-ADM-4 | Ekspor biodata semua tim ke CSV | MUST |
| FR-ADM-5 | Atur jadwal semua tahap | MUST |
| FR-ADM-6 | Override deadline per tim | MUST |
| FR-ADM-7 | Kelola materi case (upload/hapus/urutan) | MUST |
| FR-ADM-8 | Monitoring submission (sudah/belum, waktu, ukuran), unduh per tim | MUST |
| FR-ADM-9 | **Unduh semua submission sebagai ZIP** dengan nama `Nama Kelompok.pdf` (dan mode kode tim) | MUST |
| FR-ADM-10 | Kelola pengumuman (CRUD, audiens, pin, jadwal terbit) | MUST |
| FR-ADM-11 | Kelola finalis + tombol publikasi terpisah | MUST (Fase 3) |
| FR-ADM-12 | Monitoring pitch deck + ZIP | MUST (Fase 3) |
| FR-ADM-13 | Dashboard ringkas (jumlah akun, biodata lengkap, sudah submit, sisa waktu) | SHOULD |
| FR-ADM-14 | Audit log terlihat | SHOULD |
| FR-ADM-15 | Buat akun tim dari UI (Edge Function) | MAY (default: skrip lokal) |

## 6. Aturan bisnis (ditegakkan di database)

| ID | Aturan |
|---|---|
| BR-1 | Satu akun ↔ satu tim (`teams.user_id` unik). |
| BR-2 | Peserta hanya melihat dan mengubah data timnya sendiri. Tidak ada policy tulis langsung pada `teams` dan `team_members` untuk peserta; perubahan lewat RPC. |
| BR-3 | Materi case hanya terbaca jika: tim aktif ∧ biodata lengkap ∧ `now() ≥ case_release.opens_at`. Berlaku untuk **metadata** (`case_materials`) dan **file** (storage). |
| BR-4 | Upload/timpa/hapus submission hanya jika: tim aktif ∧ biodata lengkap ∧ tahap terbuka (memakai override tim bila ada). |
| BR-5 | Submission `pitch_deck` hanya jika tim ada di `finalists` dengan `published=true`. |
| BR-6 | Path file terkunci: `{team_id}/{stage}/main.pdf` (atau `attachment.zip`). Constraint di tabel + policy storage. |
| BR-7 | Tim tidak dapat mengubah `code`, `category`, `payment_verified`, `is_active`, atau `finalists`. |
| BR-8 | Tim baru yang dibuat setelah `case_release.opens_at` langsung dapat mengakses case setelah biodata lengkap; deadline submission sama untuk semua kecuali ada override. |
| BR-9 | Semua waktu dievaluasi memakai `now()` server database. |
| BR-10 | Admin ditentukan hanya oleh tabel `admins`. Tabel itu tidak dapat diakses lewat API. |

## 7. Persyaratan non-fungsional

- **Keamanan:** RLS aktif di semua tabel publik; bucket storage private; tanpa `service_role` di klien; input divalidasi di klien **dan** database; markdown tanpa HTML mentah (cegah XSS).
- **Kinerja:** halaman awal < 3 detik pada 4G; bundle awal < 300 KB gzip jika memungkinkan (lazy-load area admin dan `jszip`).
- **Ketersediaan:** cegah auto-pause Supabase free tier (keep-alive); prosedur pemulihan ada di runbook.
- **Kapasitas storage (penting):** kuota free tier ±1 GB (cek nilai pasti di dashboard). Anggaran: 150 tim × 10 MB ≈ 1,5 GB **kasus terburuk**, tetapi PDF jawaban umumnya 1–5 MB. Pantau pemakaian; jika mendekati batas, upgrade Pro satu bulan atau turunkan batas ukuran. Timpa file (upsert) tidak menambah storage.
- **Egress:** kuota 5 GB/bulan. Jaga file case kecil; jangan menaruh video.
- **Aksesibilitas:** kontras cukup, label form, fokus terlihat, navigasi keyboard; responsif dari 360 px.
- **Privasi:** data pribadi minimum; tidak ada analytics pihak ketiga; hapus data setelah lomba sesuai kebijakan (lihat runbook).
- **Lokalisasi:** UI berbahasa Indonesia; format tanggal `id-ID`, zona WIB.

## 8. Acceptance criteria (ringkas, format Given/When/Then)

**AC-1 Login & guard**
- Given pengunjung tak login, When membuka `#/case`, Then diarahkan ke `#/login`.
- Given akun nonaktif, When login, Then melihat pesan akun dinonaktifkan dan tidak ada data termuat.

**AC-2 Biodata**
- Given tim login tanpa biodata, When memilih 3 anggota dan mengisi semua field valid + ketua + persetujuan, Then tersimpan dan status "Biodata lengkap" muncul.
- Given nama kelompok sudah dipakai tim lain (beda huruf besar/kecil), When simpan, Then ditolak dengan pesan jelas dan **tidak ada** data parsial tersimpan.
- Given ketua lebih dari satu atau nol, When simpan, Then ditolak.
- Given `case_submission` sudah lewat deadline efektif tim, When membuka Biodata, Then form read-only.

**AC-3 Case Release**
- Given sebelum 2 Okt 08:00 WIB, When tim memanggil API storage langsung untuk file case, Then ditolak (bukan hanya disembunyikan UI).
- Given setelah rilis tetapi biodata belum lengkap, When mengunduh, Then ditolak.
- Given setelah rilis dan biodata lengkap, When klik unduh, Then file terunduh via signed URL kadaluarsa ≤ 60 detik.

**AC-3b Timing**
- Given jam perangkat peserta salah, When melihat countdown, Then countdown mengikuti jam server.

**AC-4 Submission**
- Given tahap terbuka, When upload PDF 3 MB valid, Then baris `submissions` dan objek storage ada, bukti tampil, `submission_events` mencatat `upload`.
- Given PDF sudah ada, When upload ulang, Then menimpa; event `replace`; ukuran/waktu diperbarui.
- Given 1 detik setelah deadline, When upload (via UI atau API), Then ditolak.
- Given override deadline +2 hari untuk tim A, When tim A upload setelah deadline umum, Then berhasil; tim B tetap ditolak.
- Given file non-PDF atau > 10 MB, When upload, Then ditolak di klien dan di server.
- Given tim A, When mencoba menulis/membaca `B-team-id/case_submission/main.pdf`, Then ditolak.

**AC-5 Pengumuman**
- Given pengumuman `participants`, When dilihat pengunjung anonim, Then tidak muncul.
- Given pengumuman `finalists`, When dilihat tim non-finalis, Then tidak muncul.
- Given pengumuman belum terbit (`published_at` di masa depan), When dilihat siapa pun non-admin, Then tidak muncul.

**AC-6 Finalis & Pitch Deck**
- Given tim ditandai finalis tetapi belum dipublikasikan, When tim membuka Pitch Deck, Then masih terkunci dan daftar publik kosong.
- Given finalis terpublikasi dan tahap `pitch_deck` terbuka, When upload PDF, Then berhasil.
- Given non-finalis, When upload via API langsung, Then ditolak.

**AC-7 Admin**
- Given admin, When menekan "Unduh semua (nama kelompok)", Then menerima ZIP berisi `Nama Kelompok.pdf` untuk setiap tim yang sudah submit, dengan nama file bersih dari karakter terlarang dan tanpa duplikat.
- Given non-admin, When mengakses `#/admin`, Then ditolak dan API admin tidak mengembalikan data.
- Given admin menambah override deadline untuk tim, When dilihat tim, Then deadline efektif di dashboard tim berubah.

## 9. Pertanyaan terbuka (default dipakai bila tidak dijawab)

1. Apakah pitch deck boleh PPTX? *(default: PDF saja)*
2. Apakah perlu lampiran tambahan (Excel/kode) pada submission? *(default: tidak)*
3. Jam pasti rilis case pada 2 Okt? *(default: 08:00 WIB)*
4. Deadline pitch deck? *(default: 26 Nov 23:59 WIB)*
5. Apakah bukti mahasiswa aktif wajib? *(default: opsional)*
