# Runbook Operasional & Mitigasi ACASE 2026

Dokumen ini adalah *checklist* untuk panitia saat menjalankan portal lomba atau ketika terjadi insiden/keadaan darurat.

## 1. Operasi Rutin

### Membuat Akun Peserta Baru
1. Tambahkan data peserta (email, kategori) ke file `participants.csv` di folder `scripts/`.
2. Buka Terminal, masuk ke folder `scripts/`.
3. Jalankan:
   ```bash
   $env:SUPABASE_URL="https://xxxx.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
   node create-accounts.mjs participants.csv
   ```
4. Bagikan *file* hasil (`credentials-YYYYMMDD.csv`) secara aman ke panitia publikasi.

### Mengatur Jadwal Lomba (Buka/Tutup Tahap)
1. Login ke panel Admin (`/#/admin`).
2. Masuk ke menu **Jadwal**.
3. Atur tanggal dan jam sesuai WIB, tekan Simpan.
4. *Perhatian:* Mengubah jadwal `closes_at` akan secara otomatis berlaku untuk *semua* tim secara instan, kecuali tim yang punya "Override".

### Unggah Materi Case
1. Pastikan file materi siap (maksimal 50 MB, PDF/ZIP/Excel).
2. Upload via menu **Materi Case** di panel Admin.
3. *Sangat disarankan:* Lakukan upload H-1 sebelum *Case Release* terbuka. Sistem otomatis menguncinya dari peserta sampai jam buka tiba.

## 2. Penanganan Insiden Darurat (Mitigasi)

### Keadaan: Peserta Lupa Password
* **Mitigasi:** Jalankan `node reset-password.mjs email@peserta.com` dari folder `scripts/`. Bagikan password acak baru yang muncul di terminal kepada perwakilan tim. Jangan biarkan peserta berbagi *login* ke pihak luar.

### Keadaan: Peserta Terlambat / Minta Ekstensi Waktu Individu
* **Mitigasi:** Jangan ubah jadwal global! Masuk ke menu **Detail Tim** di panel Admin, gulir ke bagian **Override Deadline**. Atur perpanjangan (misalnya +2 jam) khusus untuk tim tersebut pada tahap yang diminta.

### Keadaan: Server Supabase Mati / Eror
* **Mitigasi:**
  1. Cek `status.supabase.com`.
  2. Jika *down* parah, minta peserta mengirim file submission ke email darurat (`asiqugm@gmail.com`).
  3. Setelah pulih, panitia bisa menonaktifkan portal sementara dengan menghapus jadwal atau mem-Pinned pengumuman "Sistem dalam perbaikan".

### Keadaan: Akun Admin Suspend / Diretas
* **Mitigasi:** Admin utama masuk ke dashboard Supabase SQL Editor dan jalankan `delete from public.admins where user_id = 'UUID_AKUN_PERETAS';`. Jika perlu, blokir *user* di tab Authentication Supabase.

---

# Lampiran: PANDUAN PESERTA (Bagikan ke Peserta)

---

**PANDUAN PORTAL PESERTA ACASE 2026**

Halo, Calon Aktuaris Masa Depan! 
Berikut adalah cara mengakses dan menggunakan Portal ACASE 2026.

**1. Login & Kredensial**
- Portal dapat diakses melalui: `https://[DOMAIN-PORTAL]/`
- Gunakan **Email** dan **Password** yang telah kami berikan secara personal.
- Password ini bersifat permanen dan rahasia, mohon simpan baik-baik. Jika lupa, silakan hubungi narahubung panitia.

**2. Lengkapi Biodata (Wajib)**
- Sebelum dapat mengunduh materi *Case*, Anda **wajib** melengkapi form Biodata kelompok.
- Masukkan nama ketua dan anggota, NIM, email, serta foto KTM/SS Mahasiswa Aktif.
- Selama belum *submit case*, biodata masih dapat diubah.

**3. Mengunduh & Mengerjakan Case**
- Setelah waktu rilis tiba, menu **Materi Case** akan terbuka. Anda dapat mengunduh file soal.
- Jika menu masih terkunci meskipun sudah waktunya, silakan *refresh* halaman web Anda (sistem mengecek jam dari peladen pusat).

**4. Mengumpulkan Karya (Submission)**
- Masuk ke halaman **Submission**.
- Unggah file jawaban Anda dengan format PDF (maks. 10 MB).
- Anda **bebas menimpa/mengunggah ulang** berkas revisi berkali-kali selama belum melewati jam *deadline*. Berkas terakhir yang terkirim pada detik *deadline* adalah yang kami nilai.
- Nama file Anda akan otomatis dienkripsi dan diganti oleh sistem kami demi prinsip penilaian anonim (*Blind Judging*). Anda tidak perlu pusing memikirkan format nama file.

**Butuh Bantuan?**
- Jika sistem *error* atau ada pertanyaan teknis, hubungi:
  - WhatsApp: +62 812-XXXX-XXXX
  - Email: asiqugm@gmail.com

Selamat Berkompetisi!
— Panitia ASiQ 2026
