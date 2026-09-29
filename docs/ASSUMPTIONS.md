# Asumsi dan Keputusan Default

Dokumen ini mencatat asumsi yang dipakai berdasarkan §5 dari `00-README.md`.
Jika ada keputusan berbeda dari panitia, perbarui bagian terkait.

| # | Topik | Keputusan |
|---|---|---|
| D1 | Format submission utama | PDF saja, maks 10 MB |
| D2 | Lampiran tambahan | Slot `attachment.zip` dimatikan (`VITE_ENABLE_ATTACHMENT=false`) |
| D3 | Format pitch deck | PDF saja, maks 10 MB |
| D4 | Biodata wajib sebelum unduh case | Ya |
| D5 | Biodata bisa diedit sampai | Deadline case submission efektif per tim |
| D6 | Bukti mahasiswa aktif | Opsional, tidak wajib |
| D7 | Kode tim | `ACASE-001`, `ACASE-002`, … otomatis oleh skrip |
| D8 | ZIP admin | Dua mode: nama kelompok (default) dan kode tim (blind) |
| D9 | Signup publik | Dimatikan; akun dibuat panitia via skrip lokal |
| D10 | Reset password | Manual oleh admin; reset email hanya jika SMTP dipasang |
| D11 | Zona waktu | Simpan `timestamptz` (UTC), tampilkan WIB (`Asia/Jakarta`) |
| D12 | Bahasa UI | Indonesia |
| D13 | Login | Email + password |
| D14 | Nama kelompok | Unik case-insensitive, 3–60 karakter |

## Asumsi Tambahan

- Pitch deck hanya PDF (bukan PPTX).
- Tidak ada lampiran tambahan (Excel/kode) pada submission.
- Case dirilis 2 Okt 2026 pukul 08:00 WIB.
- Deadline pitch deck: 26 Nov 2026 23:59 WIB.
- Bukti mahasiswa aktif tidak diwajibkan.
- Hosting frontend: GitHub Pages (repo publik).
