# 07 — Prompt Siap Tempel untuk AI Agent

Cara pakai:

1. Taruh seluruh folder dokumen ini di repo (`docs/`) agar agent bisa membacanya. Jika agent tidak bisa membaca file, tempel isi dokumen yang disebut di tiap prompt.
2. Tempel **Prompt 0** sekali di awal sesi (atau sebagai instruksi proyek/`AGENTS.md`/`CLAUDE.md`).
3. Jalankan **Prompt 1 → 5 secara berurutan**. Jangan lanjut ke prompt berikutnya sebelum laporan prompt sebelumnya kamu periksa.
4. Bagikan ke agent hanya: URL Supabase dan **anon key**. **Jangan pernah membagikan `service_role` key.** Skrip di `scripts/` kamu jalankan sendiri di laptopmu.

Hal yang perlu kamu siapkan lebih dulu: project Supabase (staging + production), akun GitHub/repo, logo, teks ketentuan lomba, nomor WhatsApp panitia, dan (jika ada) file CSS tema situs.

---

## Prompt 0 — Konteks dan aturan kerja (tempel pertama)

```
Kamu adalah engineer senior yang membangun "Portal Peserta ACASE 2026" (Actuarial Case Competition, ASiQ 2026, HIMARIA FMIPA UGM) dari nol sampai siap deploy.

Baca SEMUA dokumen di folder docs/ sebelum menulis kode, dalam urutan:
00-README.md, 01-PRD-requirements.md, 02-backend-supabase.md, 03-frontend.md,
04-admin-panel.md, 05-security-and-testing.md, 06-deployment-and-operations.md.

Ringkasan: portal terpisah dari WordPress universitas. Akun tim dibuat panitia (tidak ada signup). Peserta: login → isi biodata → unduh case (terkunci waktu rilis) → submit PDF jawaban (terkunci deadline) → lihat pengumuman/finalis → (finalis) submit pitch deck. Admin: kelola tim, jadwal, materi case, pengumuman, finalis, dan unduh semua submission sebagai ZIP bernama "Nama Kelompok.pdf". Stack: Supabase (Postgres+Auth+Storage, free tier) + Vite/React/TypeScript statis (GitHub Pages/Cloudflare Pages).

ATURAN KERJA (wajib):
1. Database adalah penegak aturan (RLS, fungsi SECURITY DEFINER, policy storage). Jangan pernah mengandalkan validasi frontend untuk keamanan atau deadline.
2. Ikuti SQL di 02-backend-supabase.md. Jika kamu menemukan bug atau perbaikan, buat migrasi baru dan jelaskan alasannya; jangan diam-diam menyimpang.
3. Jangan pernah menaruh, meminta, atau memakai service_role key di frontend, repo, atau percakapan ini. Skrip admin memakainya hanya dari environment variable di laptop manusia.
4. Jika ada ambiguitas, pakai keputusan default di 00-README.md bagian 5 dan catat di docs/ASSUMPTIONS.md. Jangan berhenti untuk bertanya hal sepele; tanyakan hanya jika benar-benar buntu atau berisiko.
5. Jangan menambah fitur di luar dokumen.
6. Kerjakan per fase. Di akhir tiap fase, jalankan pengujian terkait (05-security-and-testing.md) dan laporkan hasil dengan bukti. Jangan menyatakan "selesai" tanpa menjalankan uji.
7. Semua UI berbahasa Indonesia; waktu tampil WIB (Asia/Jakarta); simpan timestamptz.
8. Tulis kode yang bersih, bertipe (TypeScript strict), tanpa dependensi yang tidak perlu, dengan penanganan galat dan status loading pada setiap panggilan jaringan.
9. Beri tahu saya di akhir tiap fase: apa yang dibuat, apa yang harus saya lakukan manual (mis. menjalankan SQL, mengatur Auth di dashboard), dan apa risikonya.

Balas dengan konfirmasi singkat: ringkasan pemahamanmu dalam 8-10 baris, daftar asumsi yang akan kamu pakai, dan pertanyaan penting (maksimal 3) jika ada. Belum perlu menulis kode.
```

---

## Prompt 1 — Backend Supabase (Fase 1)

```
FASE 1A — BACKEND.

Tugas:
1. Buat struktur repo seperti di 00-README.md bagian 4.
2. Buat file migrasi supabase/migrations/0001_tables.sql sampai 0007_seed.sql dari 02-backend-supabase.md (salin dengan setia; perbaiki hanya jika menemukan galat, dan catat perubahan).
3. Buat scripts/package.json, scripts/create-accounts.mjs, scripts/reset-password.mjs, scripts/make-admin.sql, dan .gitignore (termasuk .env*, credentials-*.csv, node_modules).
4. Tinjau SQL untuk: urutan dependensi, sintaks Postgres 15+, kebenaran policy RLS, dan celah eskalasi hak. Laporkan temuanmu.
5. Buat docs/SETUP-SUPABASE.md berisi langkah manual bernomor untuk saya (membuat project, mengatur Auth: matikan signup, Site URL, menjalankan tiap migrasi berurutan di SQL Editor, membuat admin, membuat akun uji).
6. Tulis file docs/tests/rls-tests.sql berisi semua uji T-* dari 05-security-and-testing.md, dengan placeholder UUID yang jelas.

Kriteria selesai:
- Semua migrasi berjalan tanpa galat berurutan pada database kosong (jelaskan bagaimana kamu memverifikasi jika tidak bisa menjalankannya; sarankan saya menjalankannya di staging dan kirimkan hasil query verifikasi bagian 11).
- Tidak ada policy tulis untuk peserta pada teams, team_members, finalists, admins.
- Laporan singkat: daftar tabel/fungsi/policy, temuan review, dan langkah manual untuk saya.

Jangan mulai frontend pada tahap ini.
```

**Setelah prompt ini:** jalankan migrasi di staging, jalankan `rls-tests.sql`, tempel hasilnya ke agent. Perbaiki sampai lulus.

---

## Prompt 2 — Frontend peserta: Login, Biodata, Case Release (Fase 1, target sebelum 2 Okt)

```
FASE 1B — FRONTEND PESERTA (MVP untuk Case Release).

Baca ulang 03-frontend.md. Inisialisasi web/ (Vite + React + TS strict), pasang dependensi, dan bangun:
1. Fondasi: lib/supabase.ts (flowType 'pkce'), styles/tokens.css sesuai tema, Layout/Navbar/Footer, Toast, Countdown, LockedCard, ErrorBoundary, useSession, useMyStatus (dengan sinkronisasi jam server), useCountdown, format.ts, validators.ts.
2. Router HashRouter dengan guard RequireAuth, RequireTeam (tangani akun nonaktif), RequireAdmin (placeholder dulu).
3. Halaman: Login, Dashboard (checklist + tenggat berikutnya + bantuan), Biodata (2/3 anggota, semua validasi, RPC save_team_biodata, prefill, read-only setelah deadline, draft di sessionStorage, upload bukti opsional), Case Release (3 keadaan, unduh via signed URL 60 detik), Profil (ganti password), 404.
4. Halaman Pengumuman publik (boleh versi sederhana dulu).
5. Menu Case Submission dan Pitch Deck tampil sebagai kartu terkunci "segera hadir" (belum diimplementasi penuh).

Batasan: hanya pakai panggilan API dari 02-backend-supabase.md bagian 10. Jangan pakai service_role. Semua teks Indonesia. Tema sesuai 00-README.md bagian 7 dan 03-frontend.md bagian 6.

Kriteria selesai:
- npm run build dan npm run lint bersih.
- Uji manual E-01 s.d. E-08, E-13, E-27, E-28 dari 05-security-and-testing.md (laporkan hasil; untuk yang perlu backend hidup, berikan langkah uji untuk saya).
- Buat web/.env.example dan docs/DEV.md (cara menjalankan lokal).
- Jelaskan cara menaruh tombol "Portal Peserta" di actuarial_case.html.
```

---

## Prompt 3 — Case Submission, Pengumuman, Panel Admin (Fase 2, sebelum 29 Okt)

```
FASE 2 — SUBMISSION DAN PANEL ADMIN.

Baca 03-frontend.md (bagian 8.5, 8.6) dan seluruh 04-admin-panel.md.

Bangun:
A. Peserta:
   - SubmissionPanel yang dapat dipakai ulang (stage: case_submission | pitch_deck) dengan seluruh keadaan di tabel 8.5, validasi PDF (ekstensi, MIME, header %PDF-, batas ukuran), alur unggah storage → upsert baris submissions, bukti (waktu dari server), penanganan galat parsial, dan lampiran opsional bila flag aktif.
   - Halaman Case Submission memakai komponen itu. Dashboard menampilkan status submission.
   - Halaman Pengumuman final (pinned, badge audiens, Markdown aman) + bagian Finalis (dari view public_finalists).
B. Admin (lazy-loaded):
   - Layout admin + guard.
   - Dashboard ringkas, Daftar tim (pencarian/filter/ekspor CSV biodata dengan BOM UTF-8), Detail tim (status, catatan, override deadline, unduh file, riwayat unggahan), Jadwal (input WIB → timestamptz +07:00), Materi case (upload/hapus/urutan), Monitoring submission dengan ZIP "Nama Kelompok.pdf" persis seperti spesifikasi (sanitasi nama, anti-duplikat, konkurensi 4, progres, laporan galat, mode kode tim, manifest opsional), Pengumuman (CRUD + pratinjau + penjadwalan).
   - Audit log untuk aksi penting.

Batasan: tanpa service_role; semua akses admin mengandalkan policy *_admin. Konfirmasi untuk aksi destruktif.

Kriteria selesai:
- Uji E-09 s.d. E-30 (kecuali yang khusus finalis) dan T-SUB-*, T-ANN-*, T-ADM-*. Laporkan hasil.
- Bukti bahwa ZIP menghasilkan nama file yang benar pada kasus: nama dengan karakter terlarang, dua nama yang sama-tanpa-huruf-besar, dan nama sangat panjang.
- Bukti bahwa mengatur closes_at ke 5 menit lagi membuat upload ditolak setelahnya.
- Ringkasan hal yang harus saya lakukan manual.
```

---

## Prompt 4 — Finalis dan Pitch Deck (Fase 3, sebelum 21 Nov)

```
FASE 3 — FINALIS, PITCH DECK, PENYELESAIAN.

Baca 04-admin-panel.md bagian 8, 10, 12, 13 dan 03-frontend.md bagian 8.7.

Bangun:
1. Admin Finalis: pilih tim → tandai (published=false) → daftar draft → tombol Publikasikan dengan dialog konfirmasi mengetik "PUBLIKASI" dan opsi membuat pengumuman otomatis; tarik publikasi; audit log.
2. Halaman Pitch Deck peserta memakai SubmissionPanel(stage='pitch_deck') dengan keadaan terkunci untuk non-finalis dan sebelum pitch_deck.opens_at.
3. Admin Monitoring Pitch Deck + ZIP (komponen yang sama, dibatasi finalis).
4. Halaman Audit Log.
5. (Opsional, hanya bila saya konfirmasi) MFA TOTP untuk admin sesuai 04-admin-panel.md bagian 13. Jangan aktifkan pengetatan aal2 tanpa konfirmasi eksplisit saya.
6. Rapikan: aksesibilitas, empty states, teks galat, performa (lazy-load jszip dan area admin).

Kriteria selesai: uji E-19 s.d. E-22, E-24, T-PIT-1, T-FIN-1 lulus; regresi T-ISO-1, T-SUB-1, T-CASE-1 lulus. Laporkan.
```

---

## Prompt 5 — Keamanan, deploy, dan runbook (sebelum rilis)

```
FASE 5 — AUDIT KEAMANAN DAN DEPLOY.

1. Jalankan seluruh checklist di 05-security-and-testing.md bagian 2. Lakukan pemindaian repo dan bundle untuk "service_role", kunci, dan data pribadi. Laporkan bukti.
2. Lakukan review kode khusus keamanan: cari dangerouslySetInnerHTML, penggunaan service_role, kueri tanpa filter yang mengandalkan UI, dan kebocoran data lewat view/RPC. Perbaiki atau laporkan.
3. Buat .github/workflows/deploy.yml dan keepalive.yml sesuai 06-deployment-and-operations.md (sesuaikan domain via placeholder yang jelas), dan docs/DEPLOY.md berisi langkah bernomor untuk saya: secret yang harus diisi, DNS/CNAME, pengaturan Auth, urutan go-live.
4. Buat docs/RUNBOOK.md dari bagian 8-9 dokumen 06 dalam format checklist yang siap dicetak, plus panduan singkat peserta (1 halaman, Bahasa Indonesia) yang bisa saya kirim bersama kredensial akun.
5. Buat laporan uji akhir dengan format di 05 bagian 7.

Kriteria selesai: semua checklist hijau atau ada daftar risiko tersisa yang eksplisit dengan rekomendasi.
```

---

## Prompt cadangan (gunakan sesuai kebutuhan)

**Perbaiki bug RLS/SQL**
```
Uji berikut gagal: [tempel ID uji + output]. Analisis akar masalahnya, jelaskan, lalu buat migrasi baru (0008_fix_xxx.sql) yang memperbaikinya tanpa melemahkan aturan keamanan. Jalankan ulang uji terkait beserta T-ISO-1, T-SUB-1, T-CASE-1 dan laporkan.
```

**Mencocokkan tema dengan situs**
```
Berikut CSS tema situs ASiQ (WordPress): [tempel]. Cocokkan design tokens, tombol, section, dan footer portal agar terasa satu keluarga. Beri daftar perbedaan yang kamu putuskan dan mengapa.
```

**Perubahan kebutuhan**
```
Perubahan kebutuhan: [jelaskan]. Analisis dampaknya pada skema, RLS, frontend, admin, dan uji. Usulkan rencana perubahan minimal, tunggu persetujuan saya, lalu implementasikan lewat migrasi baru dan perbarui dokumen di docs/ yang terkena.
```

**Review akhir independen**
```
Bertindaklah sebagai pentester. Tanpa membaca komentar kode, cari cara bagi peserta (tim A) untuk: (1) membaca data/file tim B, (2) mengambil case sebelum rilis, (3) submit setelah deadline, (4) submit pitch deck tanpa jadi finalis, (5) menjadi admin. Untuk tiap upaya, tunjukkan pemanggilan supabase-js yang dicoba dan hasilnya. Laporkan setiap keberhasilan sebagai temuan kritis.
```

---

## Tips agar agent bekerja baik

- Berikan konteks bertahap: satu fase per sesi/prompt; jangan minta "bangun semuanya sekaligus".
- Minta agent **menjalankan** uji, bukan hanya menulisnya. Jika ia tidak bisa terhubung ke Supabase, ia harus memberimu perintah/SQL untuk dijalankan dan kamu tempel hasilnya.
- Setiap kali agent mengubah SQL, minta ia membuat **migrasi baru**, bukan mengedit file lama yang sudah kamu jalankan.
- Periksa sendiri hal-hal ini walau agent sudah melapor: (1) tidak ada `service_role` di repo, (2) uji isolasi antar tim di staging dengan dua akun asli, (3) unduh ZIP dan buka hasilnya, (4) ubah `closes_at` dan buktikan upload ditolak.
- Karena Case Release dijadwalkan 2 Okt 2026, kerjakan **Prompt 1 dan 2 lebih dulu**; jika mepet, gunakan fallback di 00-README.md bagian 8.
