# Panduan Deployment (Go-Live) ACASE 2026

Dokumen ini berisi panduan tahap demi tahap untuk mempublikasikan portal ini secara online menggunakan GitHub Pages dan Supabase.

## 1. Persiapan Repositori (GitHub)
1. Buat repositori kosong di GitHub (publik atau privat, sesuai lisensi GitHub Pages Anda).
2. Push seluruh kode sumber ini ke repositori tersebut pada *branch* `main`.
3. Buka tab **Settings > Secrets and variables > Actions** di repositori GitHub Anda.
4. Tambahkan **New repository secret**:
   - `VITE_SUPABASE_URL`: isi dengan URL project Supabase Anda (mis. `https://xxxx.supabase.co`).
   - `VITE_SUPABASE_ANON_KEY`: isi dengan `anon key` dari Supabase.

## 2. Pengaturan GitHub Pages
1. Masih di **Settings**, pilih menu **Pages** di sebelah kiri.
2. Pada bagian **Build and deployment**:
   - **Source**: Pilih `GitHub Actions`.
3. Setelah kode dipush ke `main`, GitHub Actions akan otomatis melakukan _build_ dan mempublikasikan web.
4. *Opsional (Custom Domain)*: Jika menggunakan domain kampus (mis. `portal.asiq.mipa.ugm.ac.id`), masukkan di kolom **Custom domain** dan atur DNS/CNAME domain Anda mengarah ke `<username>.github.io`.

## 3. Pengaturan Keamanan Akhir di Supabase
Sebelum mengumumkan portal ke peserta, pastikan hal-hal berikut sudah dicek di [Supabase Dashboard](https://app.supabase.com):
1. Buka **Authentication > Providers > Email**, pastikan **Confirm email** MATI jika tidak pakai SMTP custom (karena admin yang membuat password).
2. Matikan **Allow new users to sign up** (ini sangat penting agar tidak sembarang orang mendaftar).
3. Buka **Authentication > URL Configuration**:
   - Ganti **Site URL** menjadi URL GitHub Pages/Domain Custom Anda (mis. `https://ugm.github.io/acase-portal/` atau `https://portal.asiq.mipa.ugm.ac.id`).
   - Hapus/abaikan `http://localhost:5173` dari Redirect URLs jika sudah masuk fase produksi.
4. Buka **Storage > Policies**, pastikan ketiga *bucket* (`case-files`, `submissions`, `student-proofs`) bersifat **Private** (lambang gembok).

## 4. Urutan Go-Live
1. Verifikasi _build_ sukses di GitHub Actions dan web bisa diakses.
2. Login sebagai admin menggunakan akun yang sudah di-_insert_ ke tabel `admins`.
3. Buat dan terbitkan Pengumuman pertama (Misal: "Selamat datang peserta ACASE 2026!").
4. Jalankan script `node create-accounts.mjs` di lokal untuk membuat akun peserta.
5. Kirimkan email blast / WhatsApp berisi `PANDUAN_PESERTA.md` dan kredensial masing-masing tim.
6. Pantau tabel _Audit Log_ secara berkala.
