# ACASE Portal — Ringkasan Proyek & Indeks Dokumen

> Dokumen ini adalah **titik masuk**. Baca ini dulu, lalu baca dokumen lain sesuai urutan di bagian "Indeks".
> Ditujukan untuk AI agent (dan manusia) yang akan membangun portal ini dari nol sampai deploy.

## 1. Konteks

- **Acara:** ASiQ 2026 (Actuarial Science in Quest), diselenggarakan HIMARIA, FMIPA UGM.
- **Lomba:** *Actuarial Case Competition (ACASE)* — kompetisi studi kasus aktuaria, case collaborator Tugu Insurance. Peserta tim 2–3 orang, mahasiswa D3/D4/S1.
- **Situs utama** berjalan di **WordPress Multisite (WPMU)** milik universitas. Situs itu tidak bisa dipakai untuk backend. Maka dibuat **portal peserta terpisah** (domain/subdomain berbeda) yang di-link dari halaman ACASE lewat satu tombol.
- **Tujuan portal:** peserta login (akun dibuat panitia), mengisi biodata tim, mengunduh case pada waktu rilis, mengumpulkan jawaban (PDF), melihat pengumuman/finalis, dan (finalis saja) mengumpulkan pitch deck. Panitia mengelola semuanya lewat panel admin.
- **Skala:** perkirakan ≤ 150 tim, ≤ ~450 orang. Trafik rendah, dengan lonjakan menjelang deadline.

### Timeline lomba (semua WIB, tahun 2026)

| Tahap | Tanggal |
|---|---|
| Early Bird | 16 Sep – 22 Sep |
| Regular Registration | 23 Sep – 3 Okt |
| **Case Release** | **2 Okt** |
| **Paper (Case) Submission Deadline** | **29 Okt** |
| **Finalist Announcement** | **21 Nov** |
| Final Presentation | 28 Nov |
| Awarding | 29 Nov |

Pitch deck finalis harus dikumpulkan antara 21 Nov dan 28 Nov. Default deadline: **26 Nov 23:59 WIB** (bisa diubah admin).

## 2. Stack yang diputuskan

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Database, Auth, Storage | **Supabase** (free tier) | Postgres + RLS adalah sumber kebenaran semua aturan bisnis |
| Frontend | **Vite + React 18 + TypeScript**, `react-router-dom` (HashRouter), `@supabase/supabase-js`, `@tanstack/react-query`, `react-hook-form` + `zod`, `jszip`, `react-markdown` | SPA statis, tanpa server |
| Hosting frontend | **GitHub Pages** atau **Cloudflare Pages** | Keduanya gratis; workflow disediakan |
| Domain | Subdomain kampus (CNAME) jika bisa, jika tidak domain sendiri | Lihat `06-deployment-and-operations.md` |
| Skrip admin | Node.js 20 (`scripts/`) memakai `service_role` **hanya di laptop admin** | Tidak pernah masuk repo atau frontend |

## 3. Indeks dokumen (urutan baca dan urutan kerja)

| # | File | Isi |
|---|---|---|
| 00 | `00-README.md` | Ringkasan ini |
| 01 | `01-PRD-requirements.md` | Requirement produk: aktor, fitur, aturan bisnis, acceptance criteria |
| 02 | `02-backend-supabase.md` | **SQL lengkap** (tabel, fungsi, RLS, storage, view, seed), skrip akun, konfigurasi Auth |
| 03 | `03-frontend.md` | Spesifikasi frontend peserta: halaman, alur, validasi, desain, struktur kode |
| 04 | `04-admin-panel.md` | Spesifikasi panel admin, termasuk unduh ZIP `Nama Kelompok.pdf` |
| 05 | `05-security-and-testing.md` | Model ancaman, checklist keamanan, matriks pengujian RLS |
| 06 | `06-deployment-and-operations.md` | Deploy, DNS, keep-alive, backup, runbook harian, insiden |
| 07 | `07-agent-prompts.md` | **Prompt siap tempel** per fase untuk AI agent |

## 4. Struktur repo yang diharapkan

```
acase-portal/
├── docs/                      # dokumen-dokumen ini
├── supabase/
│   └── migrations/
│       ├── 0001_tables.sql
│       ├── 0002_functions.sql
│       ├── 0003_rls.sql
│       ├── 0004_views.sql
│       ├── 0005_storage.sql
│       ├── 0006_hardening.sql
│       └── 0007_seed.sql
├── scripts/                   # dijalankan LOKAL oleh admin
│   ├── package.json
│   ├── create-accounts.mjs
│   ├── reset-password.mjs
│   └── make-admin.sql
├── web/                       # aplikasi Vite + React
└── .github/workflows/
    ├── deploy.yml
    └── keepalive.yml
```

## 5. Keputusan default (agent TIDAK boleh berhenti bertanya untuk ini, pakai default)

| # | Keputusan | Default |
|---|---|---|
| D1 | Format submission utama | **PDF saja**, maks **10 MB** |
| D2 | Lampiran tambahan submission | Slot opsional `attachment.zip`, **dimatikan** (`VITE_ENABLE_ATTACHMENT=false`) |
| D3 | Format pitch deck | PDF saja, maks 10 MB (sama dengan submission) |
| D4 | Biodata wajib lengkap sebelum bisa unduh case | **Ya** |
| D5 | Biodata bisa diedit sampai | Deadline case submission (efektif per tim) |
| D6 | Bukti mahasiswa aktif | Opsional, 1 file PDF/JPG/PNG maks 2 MB; fitur ada tapi **tidak wajib** |
| D7 | Kode tim | Format `ACASE-001`, `ACASE-002`, … dibuat otomatis oleh skrip |
| D8 | ZIP admin | Dua mode: nama kelompok (default) dan kode tim (untuk juri/blind) |
| D9 | Pendaftaran akun mandiri | **Tidak ada.** Signup publik dimatikan |
| D10 | Reset password | Manual oleh admin (skrip). Reset email hanya jika SMTP dipasang (`VITE_ENABLE_PASSWORD_RESET`) |
| D11 | Zona waktu | Simpan `timestamptz` (UTC), tampilkan **Asia/Jakarta (WIB)** |
| D12 | Bahasa UI | Indonesia |
| D13 | Login | Email + password |
| D14 | Nama kelompok | Unik (case-insensitive), 3–60 karakter |

## 6. Yang harus disediakan manusia (agent minta jika belum ada)

1. URL project Supabase dan **anon key** (boleh dibagikan ke agent). **`service_role` key JANGAN pernah dibagikan ke agent atau ditaruh di repo.**
2. Domain/subdomain portal.
3. File logo (ASiQ, HIMARIA, UGM) dan favicon.
4. Isi teks: ketentuan lomba, teks persetujuan data, kontak WhatsApp panitia.
5. File case (PDF) untuk diunggah admin pada waktu rilis.

## 7. Tema visual (diambil dari situs ASiQ yang sudah ada)

| Token | Nilai |
|---|---|
| `--navy` | `#1c2436` |
| `--navy-deep` | `#161e30` |
| `--gold` | `#c4a761` |
| `--gold-light` | `#f5e586` |
| `--cream` | `#f7f0e3` |
| `--muted` | `#a9b1bd` |
| Font utama | **Jost** (Google Fonts), fallback `Arial, sans-serif` |
| Font aksen (logo teks "ASiQ 2026") | `'Monotype Corsiva', 'Segoe Script', cursive` |

Situs utama memakai kelas `btn btn-primary` / `btn btn-ghost`, hero gelap berbintang, dan section navy/cream berselang-seling. Portal harus terasa satu keluarga dengan situs itu.

## 8. Fase dan target

| Fase | Target | Cakupan |
|---|---|---|
| **1** | **Sebelum 2 Okt 2026** | Backend lengkap, login, biodata, Case Release, skrip akun, tombol di WordPress |
| **2** | Sebelum 29 Okt | Case Submission, dashboard tim, panel admin (biodata, monitoring, ZIP), pengumuman, override deadline |
| **3** | Sebelum 21 Nov | Finalis + publikasi, Pitch Deck, audit log, MFA admin (opsional), rapikan |

**Fallback Fase 1:** jika portal belum siap pada 2 Okt, kirim case lewat email/Drive ke tim terdaftar, lalu pindahkan ke portal setelah siap.

## 9. Definition of Done (keseluruhan)

- Semua acceptance criteria di `01-PRD-requirements.md` lulus.
- Semua uji di `05-security-and-testing.md` lulus, terutama uji **isolasi antar tim** dan **penegakan deadline di sisi database**.
- Tidak ada `service_role` key di repo, di bundle frontend, atau di riwayat git.
- Portal dapat diakses lewat HTTPS di domain final dan tombol di WordPress mengarah dengan benar.
- Runbook di `06-deployment-and-operations.md` sudah dicoba sekali (termasuk unduh ZIP dan override deadline).

## 10. Aturan kerja untuk agent

1. **Database adalah penegak aturan.** Jangan pernah mengandalkan validasi frontend untuk keamanan atau deadline.
2. Kerjakan sesuai urutan file 02 → 03 → 04 → 05 → 06. Selesaikan dan uji satu fase sebelum lanjut.
3. Jika dokumen ambigu, pakai keputusan default di bagian 5 dan catat asumsi di `docs/ASSUMPTIONS.md`.
4. Jangan menambah fitur di luar dokumen kecuali diminta.
5. Setiap perubahan skema harus berupa file migrasi baru, bukan mengedit migrasi lama yang sudah dijalankan.
6. Sebelum menyatakan selesai, jalankan checklist di `05-security-and-testing.md` dan laporkan hasilnya.
