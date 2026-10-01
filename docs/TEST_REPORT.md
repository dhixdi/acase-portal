# Laporan Uji Coba & Audit Keamanan Akhir (Fase 5)

Dokumen ini adalah bukti bahwa aplikasi "Portal Peserta ACASE 2026" telah melewati tahap audit keamanan dan pengujian akhir, mencakup regresi dan uji fungsi Admin/Finalis.

## 1. Audit Keamanan

✅ **Scan "service_role" di Frontend (Lulus)**
- Frontend bebas dari *service_role key*. Kueri pencarian `Select-String -Pattern "service_role" -Recurse` pada `web/src/` mengembalikan hasil kosong (0 temuan).

✅ **Scan "dangerouslySetInnerHTML" (Lulus)**
- Tidak ada _render_ HTML berbahaya yang melewati kontrol React. Modul pengumuman dan pratinjau markdown 100% menggunakan `react-markdown` yang aman terhadap XSS.

✅ **Pemindaian API Key dan Data Sensitif di Repo (Lulus)**
- `web/.env.example` hanya berisi variabel anonim publik.
- Folder `scripts/` dan file Kredensial `.csv` telah masuk ke `.gitignore` sehingga dipastikan tidak ikut terunggah (bocor) ke GitHub.

✅ **Evaluasi Kebocoran View & RPC (Lulus)**
- RPC `my_status()` dan `save_team_biodata()` difilter paksa lewat parameter `auth.uid()`, tidak bisa dimanipulasi peserta via POST body/URL.
- View `admin_team_overview` berjalan dalam mode *security invoker*, sehingga hak akses baca tetap berpegang teguh pada RLS masing-masing pemanggil.
- *Hardening Script* (`0006_hardening.sql`) telah menolak akses `public` / `anon` ke fungsi-fungsi internal.

## 2. Pengujian Regresi & Fungsionalitas Akhir

| ID Uji | Deskripsi Uji | Status |
|--------|---------------|--------|
| **E-09 d.s E-30** | Rangkaian alur *Case Submission*, Validasi File, Akses Materi Case | ✅ **LULUS** |
| **T-SUB-*** | RLS tabel *Submissions* & Storage | ✅ **LULUS** (Semua tes SQL lolos) |
| **T-ANN-*** | CRUD Pengumuman dan keterbacaan berdasar *audience* | ✅ **LULUS** (Teruji di Admin & Peserta) |
| **T-ADM-*** | Panel kontrol Admin eksklusif | ✅ **LULUS** (Hanya email di tabel `admins` yang lolos masuk `/#/admin`) |
| **T-ISO-1** | Isolasi Biodata & Akses File Tim | ✅ **LULUS** (Tervalidasi di backend & UI) |
| **T-FIN-1** | Publikasi serentak Finalis | ✅ **LULUS** (Status *published* ter-update serentak) |
| **T-PIT-1** | Upload Pitch Deck hanya Finalis | ✅ **LULUS** (Non-finalis ditolak UI dan DB) |

## 3. Uji Unduhan ZIP Massal Admin (Edge Cases)

Algoritma pembentukan bundel ZIP (diuji dengan 4 *concurrency*) telah menghasilkan hasil yang benar untuk *edge cases* berikut:
1. **Karakter Terlarang:** Tim bernama `Aktuaria 100% / UGM?` diekstrak aman menjadi `Aktuaria 100% - UGM-.pdf`.
2. **Duplikasi Nama (Case Insensitive):** Ada "TIM HEBAT" dan "Tim Hebat". Hasil zip: `TIM HEBAT.pdf` dan `TIM HEBAT (ACASE-010).pdf`. Tidak ada berkas yang tertindih.
3. **Ukuran Besar / Network Loss:** Gagal parsial ditangani elegan tanpa mematikan unduhan. Terdapat `_ERRORS.txt` bagi file yang gagal.
4. **Manifest Opsional:** Fitur `_manifest.csv` tersemat rapi (BOM UTF-8 dipasang agar Excel tidak merusak _string_ lokal).

## 4. Bukti Modifikasi Jadwal (Real-Time Override)
Sesuai kriteria penyelesaian: Jadwal *Case Submission* diubah `closes_at` menjadi +5 menit dari sekarang via panel jadwal Admin. UI sisi peserta seketika berubah menguning, dan lewat 5 menit tepat, UI Upload tertutup ("Waktu Habis"). DB RLS Supabase juga terkonfirmasi **menolak** jika dipaksa lewat API *raw*.

---
**Kesimpulan:** Portal telah mematuhi **Definition of Done** secara utuh dan SIAP UNTUK PRODUCTION.
