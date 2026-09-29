# 06 — Deployment dan Operasional

## 1. Urutan deploy (ringkas)

1. Siapkan Supabase **staging** → jalankan migrasi 0001–0007 → uji (dokumen 05).
2. Siapkan Supabase **production** (project kedua/ketiga) → jalankan migrasi yang sama → atur Auth (dokumen 02 bagian 0).
3. Buat admin, unggah materi case (boleh sebelum rilis; terkunci RLS).
4. Deploy frontend ke hosting statis dengan env production.
5. Pasang domain/subdomain + HTTPS.
6. Tambahkan tombol di halaman WordPress.
7. Buat akun tim dengan skrip → bagikan kredensial.
8. Aktifkan keep-alive.
9. Latihan runbook sekali (ZIP, override, reset password).

> Free tier Supabase membatasi 2 project aktif. Jika hanya ingin satu, uji di lokal terhadap production **sebelum** ada data peserta, lalu bersihkan data uji (`delete from teams` untuk akun uji + hapus user uji).

## 2. Hosting frontend

### Opsi A — GitHub Pages

**Catatan:** repo Pages di paket gratis harus **publik**. Pastikan tidak ada rahasia, file case, atau data peserta di repo. `anon key` boleh publik jika RLS benar (dan memang terlihat di bundle).

Di repo: Settings → Pages → Source: **GitHub Actions**. Secret repo: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Variabel lain (`VITE_WHATSAPP_CONTACT`, dll.) boleh sebagai *Variables*.

`.github/workflows/deploy.yml`:

```yaml
name: Deploy portal
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
        working-directory: web
      - run: npm run build
        working-directory: web
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_WHATSAPP_CONTACT: ${{ vars.VITE_WHATSAPP_CONTACT }}
          VITE_MAIN_SITE_URL: ${{ vars.VITE_MAIN_SITE_URL }}
          VITE_MAX_UPLOAD_MB: ${{ vars.VITE_MAX_UPLOAD_MB }}
      - name: Tambah CNAME (jika memakai domain kustom)
        run: echo "portal.contoh-domain.id" > web/dist/CNAME
      - uses: actions/upload-pages-artifact@v3
        with:
          path: web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

(Periksa versi action terbaru saat implementasi. Hapus langkah CNAME jika memakai `*.github.io`.)

### Opsi B — Cloudflare Pages (alternatif)
Hubungkan repo → build command `npm run build`, root `web`, output `dist`, isi env `VITE_*`. Mendukung repo private dan bandwidth longgar.

## 3. Domain

**Prioritas:**
1. **Subdomain kampus** (mis. `acase.namauniv.ac.id`): minta IT universitas membuat rekaman `CNAME` ke `<user>.github.io` (GitHub Pages) atau `<project>.pages.dev` (Cloudflare). Gratis dan lebih tepercaya.
2. **Domain sendiri** murah (`.my.id`/`.web.id`/`.id`). Atur `CNAME` untuk subdomain `portal.` dan aktifkan *Enforce HTTPS* di GitHub Pages.
3. Cadangan: `*.github.io` (tanpa domain kustom).

Setelah domain final, perbarui: *Site URL* dan *Redirect URLs* di Supabase Auth, `VITE_MAIN_SITE_URL` bila perlu, dan CNAME di workflow.

## 4. Tombol di WordPress

Di `actuarial_case.html`, tambahkan tombol pada `btn-row` (contoh):

```html
<div class="btn-row">
  <a class="btn btn-ghost" href="https://drive.google.com/file/d/1ugOsU1DqoYi0yT4Y9vc09Ph-jCTRKj1L/view?us=sharing" target="_blank" rel="noopener">Download Guidebook</a>
  <a class="btn btn-primary" href="https://bit.ly/NationalActuarialCaseCompetitionASiQ2026Registration" target="_blank" rel="noopener">Register</a>
  <a class="btn btn-primary" href="https://GANTI-DOMAIN-PORTAL/" target="_blank" rel="noopener">Portal Peserta</a>
</div>
```

Opsional: tambahkan node timeline atau tautan di footer bagian "Lomba". Tidak ada logika login di WordPress; semuanya di portal.

## 5. Keep-alive (cegah auto-pause)

Free tier mem-pause project setelah seminggu tanpa aktivitas. Selama lomba berjalan, trafik peserta biasanya cukup, tetapi jeda antar tahap berisiko. Gunakan ping terjadwal.

`.github/workflows/keepalive.yml`:

```yaml
name: Keep Supabase alive
on:
  schedule:
    - cron: '0 3 */3 * *'   # tiap 3 hari, 03:00 UTC
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping database
        run: |
          curl -fsS "${{ secrets.SUPABASE_URL }}/rest/v1/stages?select=key&limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

Catatan: GitHub menonaktifkan workflow terjadwal pada repo publik yang tidak ada aktivitas selama ±60 hari; lakukan commit kecil atau aktifkan ulang manual. Cek juga manual sebelum tiap tahap penting. Jika project sudah ter-pause, pulihkan dari dashboard (data tetap ada, tetapi aplikasi mati sampai dipulihkan).

## 6. Backup dan ekspor

Free tier tidak menyediakan backup harian otomatis. Lakukan manual pada titik-titik ini:

| Kapan | Apa |
|---|---|
| Setelah biodata mayoritas lengkap (mis. 1 Okt–3 Okt) | Ekspor CSV biodata dari panel admin |
| **Segera setelah deadline case (29 Okt malam)** | Unduh ZIP submission (mode nama **dan** mode kode), ekspor CSV biodata + `submissions` |
| Sebelum publikasi finalis (21 Nov) | Ekspor tabel `teams`, `finalists`, `announcements` |
| Setelah deadline pitch deck | ZIP pitch deck |
| Mingguan (opsional) | `pg_dump` lewat connection string database (Settings → Database) |

Simpan backup di penyimpanan panitia (Drive kampus/tim) dengan akses terbatas. Beri nama berversi tanggal.

Contoh dump (di laptop yang punya `pg_dump`):

```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" \
  --schema=public --no-owner --no-privileges -f backup-$(date +%Y%m%d).sql
```

(Jika koneksi IPv6 bermasalah, pakai connection pooler dari dashboard.)

## 7. Pemantauan

- Dashboard Supabase: **Storage** (pemakaian vs kuota), **Database size**, **Egress**, **Auth users**, log API.
- Periksa 3× seminggu selama lomba aktif dan **harian** pada minggu deadline.
- Ambang kewaspadaan: storage > 70% kuota atau egress > 60% kuota → pertimbangkan Pro sebulan ($25) atau kurangi ukuran file.
- Jika bergantung pada satu penanggung jawab teknis, sediakan admin cadangan.

## 8. Runbook per tahap

### H-7 sampai H-1 sebelum Case Release (2 Okt)
- [ ] Migrasi production selesai; verifikasi (dokumen 02 bagian 11).
- [ ] Jadwal benar di `/admin/schedule` (jam rilis final, mis. 2 Okt 08:00 WIB).
- [ ] Materi case terunggah dan **tetap terkunci** (uji dengan akun tim uji).
- [ ] Akun tim dibuat untuk semua pendaftar yang sudah membayar; kredensial dikirim lewat WhatsApp/email pribadi (bukan grup publik). Sertakan URL portal dan panduan singkat.
- [ ] Panduan singkat peserta (1 halaman): login → isi biodata → tunggu rilis.
- [ ] Keep-alive aktif.
- [ ] Nomor WhatsApp bantuan siap.

### Hari rilis (2 Okt)
- [ ] Beberapa menit sebelum waktu rilis, cek status di `/admin/schedule` ("sekarang menurut server").
- [ ] Setelah rilis, coba unduh dengan akun tim uji.
- [ ] Umumkan di media sosial bahwa case tersedia di portal (tautan ke portal).
- [ ] Pantau pertanyaan; siapkan pengumuman "FAQ/klarifikasi" audiens `participants`.

### Selama masa pengerjaan (2–29 Okt)
- [ ] Buat akun untuk pendaftar regular yang masuk sampai 3 Okt.
- [ ] Follow-up tim yang biodatanya belum lengkap (daftar cepat di dashboard admin).
- [ ] Kirim pengumuman pengingat: H-7, H-3, H-1, dan hari-H (jam berapa deadline, tekankan **jangan menunggu menit terakhir**).

### Hari deadline (29 Okt)
- [ ] Standby teknis dari sore hingga lewat 23:59 WIB.
- [ ] Setelah deadline: unduh ZIP + ekspor (bagian 6). **Ini backup paling penting.**
- [ ] Tangani permintaan perpanjangan dengan kebijakan yang jelas (override per tim + catatan alasan).

### Menjelang pengumuman finalis (sampai 21 Nov)
- [ ] Siapkan finalis di `/admin/finalists` sebagai draft; periksa ejaan nama tim dan kampus.
- [ ] Pastikan jadwal `pitch_deck` (buka/tutup) sudah final dan diumumkan.
- [ ] Siapkan pengumuman untuk finalis dan pengumuman publik.
- [ ] **Publikasikan** pada waktu yang diumumkan; verifikasi dari browser anonim.

### Pitch deck (21–26 Nov)
- [ ] Pastikan menu Pitch Deck terbuka untuk finalis dan terkunci untuk lainnya.
- [ ] Ingatkan deadline; ZIP dan backup setelah deadline.

### Pasca-lomba (setelah 29 Nov)
- [ ] Arsipkan ekspor lengkap.
- [ ] Sesuai kebijakan privasi yang dinyatakan: hapus data pribadi peserta (biodata, bukti mahasiswa aktif, file) setelah periode retensi yang ditentukan panitia. Hapus objek storage terlebih dulu, lalu baris tabel, lalu akun auth.
- [ ] Jeda/hapus project Supabase bila tidak dipakai lagi, atau nonaktifkan akun tim.

## 9. Penanganan insiden

| Masalah | Tindakan |
|---|---|
| Peserta lupa/kehilangan password | `node reset-password.mjs email` lalu kirim password baru lewat kanal pribadi |
| Peserta melapor gagal upload menjelang deadline | Minta screenshot galat + jam; cek `submission_events` dan log API; bila masalah sistem, beri override deadline untuk tim itu |
| Project Supabase ter-pause | Restore dari dashboard; setelah itu cek keep-alive |
| Salah jadwal | Perbaiki di `/admin/schedule`; umumkan ralat |
| Salah tandai finalis yang sudah dipublikasikan | Tarik publikasi → koreksi → publikasikan ulang + umumkan ralat |
| Storage penuh | Upgrade Pro sementara atau hapus file uji; jangan hapus submission peserta |
| Salah unggah materi case | Ganti file lewat `/admin/case-materials` dan umumkan versi baru (audiens `participants`) |
| Kunci `service_role` bocor | **Rotasi segera** di Settings → API; perbarui skrip lokal; audit riwayat akses |
| Akun tim salah email | Ubah email lewat dashboard Auth (admin) dan perbarui `teams.login_email` |

## 10. Definition of Done — deployment

- [ ] Frontend dapat diakses via HTTPS di domain final; refresh di rute mana pun tetap bekerja.
- [ ] Auth memakai Site URL/Redirect URL yang benar; signup publik mati.
- [ ] Tombol WordPress mengarah ke portal.
- [ ] Keep-alive berjalan (cek riwayat workflow) dan telah diuji manual.
- [ ] Prosedur backup dilakukan sekali dan hasilnya dapat dibuka.
- [ ] Runbook dibaca oleh minimal 2 orang panitia.
