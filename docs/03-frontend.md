# 03 — Frontend Peserta (Vite + React + TypeScript)

Baca dulu `00-README.md`, `01-PRD-requirements.md`, dan `02-backend-supabase.md` (terutama bagian 10, *Kontrak API*). Dokumen ini mencakup semua yang dilihat **peserta dan publik**. Panel admin ada di `04-admin-panel.md` tetapi hidup di aplikasi yang sama (rute `/admin/*`, di-lazy-load).

## 1. Stack dan dependensi

| Paket | Fungsi |
|---|---|
| `react`, `react-dom` 18 | UI |
| `typescript`, `vite`, `@vitejs/plugin-react` | build |
| `react-router-dom` v6 (`HashRouter`) | routing tanpa konfigurasi server (cocok untuk GitHub Pages) |
| `@supabase/supabase-js` v2 | Auth, DB, Storage |
| `@tanstack/react-query` | cache dan sinkronisasi data server |
| `react-hook-form` + `zod` + `@hookform/resolvers` | form dan validasi |
| `react-markdown` (+ `remark-gfm`) | render pengumuman (tanpa `rehype-raw`, HTML mentah **tidak** diizinkan) |
| `jszip` | ZIP di panel admin (lazy-load) |

Tanpa UI framework berat. Gunakan **CSS biasa dengan design tokens** (CSS variables) agar mudah menyamai situs utama. Tidak ada Tailwind wajib; boleh dipakai jika agent lebih nyaman, asalkan token di bawah dipatuhi.

`vite.config.ts`: `base: './'` (agar jalan di GitHub Pages baik di root domain maupun subpath).

## 2. Environment variable

`web/.env.example`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_WHATSAPP_CONTACT=6281382265484
VITE_MAIN_SITE_URL=https://asiq.mipa.ugm.ac.id
VITE_ENABLE_ATTACHMENT=false
VITE_ENABLE_PASSWORD_RESET=false
VITE_MAX_UPLOAD_MB=10
```

Yang boleh ada di frontend hanya `anon key`. Jika agent menemukan `service_role` di mana pun di `web/`, itu bug kritis.

## 3. Klien Supabase

```ts
// web/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',   // penting agar tautan reset password tidak bentrok dengan HashRouter
    },
  }
);
```

## 4. Peta rute (HashRouter)

| Rute | Akses | Halaman |
|---|---|---|
| `/login` | publik | Login |
| `/pengumuman` | publik (konten difilter RLS) | Pengumuman + Finalis |
| `/` → redirect | login | Peserta → `/dashboard`; admin → `/admin` |
| `/dashboard` | peserta | Dashboard |
| `/biodata` | peserta | Biodata Tim |
| `/case` | peserta | Case Release |
| `/submission` | peserta | Case Submission |
| `/pitch-deck` | peserta | Pitch Deck |
| `/profil` | peserta | Ganti password |
| `/reset-password` | publik | (hanya jika `VITE_ENABLE_PASSWORD_RESET=true`) |
| `/admin/*` | admin | Lihat `04-admin-panel.md` |
| `*` | – | 404 |

**Guard:**
- `RequireAuth`: tanpa sesi → `/login?next=<rute>`.
- `RequireTeam`: pastikan `my_status.has_team`. Jika `!team.is_active` → layar "Akun dinonaktifkan" (tanpa data lain).
- `RequireAdmin`: `rpc('is_admin')` harus `true`, jika tidak → `/dashboard`.
- Setelah login: panggil `is_admin`; admin → `/admin`, selain itu → `/dashboard`.

Guard hanya kenyamanan UX. Keamanan sesungguhnya ada di RLS.

## 5. Struktur folder

```
web/src/
├── main.tsx
├── App.tsx                  # router + providers
├── lib/
│   ├── supabase.ts
│   ├── format.ts            # tanggal id-ID WIB, ukuran file, sanitasi nama
│   ├── serverTime.ts        # offset jam server & hook useNow()
│   └── validators.ts        # skema zod biodata & file
├── hooks/
│   ├── useSession.ts
│   ├── useMyStatus.ts       # rpc('my_status'), refetch berkala
│   ├── useIsAdmin.ts
│   └── useCountdown.ts
├── components/
│   ├── Layout.tsx  Navbar.tsx  Footer.tsx
│   ├── Countdown.tsx  StatusBadge.tsx  LockedCard.tsx  Toast.tsx
│   ├── FileDropzone.tsx
│   ├── SubmissionPanel.tsx  # dipakai Case Submission & Pitch Deck
│   └── Markdown.tsx         # react-markdown aman
├── pages/
│   ├── Login.tsx  Dashboard.tsx  Biodata.tsx  Case.tsx
│   ├── Submission.tsx  PitchDeck.tsx  Announcements.tsx  Profile.tsx  NotFound.tsx
│   └── admin/...            # lihat 04-admin-panel.md (lazy)
└── styles/
    ├── tokens.css  base.css  components.css
```

## 6. Design tokens dan gaya

```css
/* styles/tokens.css — disamakan dengan situs ASiQ */
:root {
  --navy: #1c2436;
  --navy-deep: #161e30;
  --gold: #c4a761;
  --gold-light: #f5e586;
  --cream: #f7f0e3;
  --muted: #a9b1bd;
  --white: #ffffff;
  --danger: #e5484d;
  --success: #3fb27f;
  --warning: #e0a63a;

  --font-body: 'Jost', Arial, sans-serif;
  --font-accent: 'Monotype Corsiva', 'Segoe Script', cursive;

  --radius: 14px;
  --radius-sm: 8px;
  --shadow: 0 10px 30px rgba(0,0,0,.25);
  --maxw: 1100px;
}
```

Pedoman:
- Latar halaman gelap `--navy-deep`; panel/kartu `--navy` dengan border tipis `rgba(196,167,97,.25)`. Bagian terang bergantian memakai `--cream` dengan teks navy (mengikuti pola section situs).
- Tombol `.btn-primary` = latar `--gold`, teks `--navy-deep`; `.btn-ghost` = transparan, border `--gold`, teks `--gold`. Hover: terang sedikit + naik 1px. Disabled: opasitas 50%, kursor `not-allowed`.
- Judul memakai Jost 600; aksen kata penting berwarna `--gold` (mirip "Case **Competition**" di situs).
- Header portal: tulisan "ASiQ 2026" dengan `--font-accent` warna emas, di kiri; kanan: menu + tombol Keluar. Footer meniru footer situs (logo ASiQ/HIMARIA/UGM, kontak `asiqugm@gmail.com`, WhatsApp panitia).
- Tautan "← Kembali ke situs ACASE" ke `VITE_MAIN_SITE_URL/actuarial-case/`.
- Mobile-first, breakpoint 640/900 px. Navbar menjadi menu hamburger < 900 px.
- Fokus terlihat (`outline: 2px solid var(--gold-light)`), kontras teks ≥ 4.5:1.
- Muat font: `<link>` Google Fonts Jost 300/400/500/600 dengan `display=swap`.
- Bila pengguna menyediakan CSS tema situs, agent **mencocokkan** variabelnya dan memberi tahu perbedaan.

## 7. Utilitas penting

### Waktu server
Peserta tidak boleh mengandalkan jam perangkat.

```ts
// lib/serverTime.ts
let offsetMs = 0;                                   // serverTime - clientTime
export function syncServerTime(serverNowIso: string) {
  offsetMs = new Date(serverNowIso).getTime() - Date.now();
}
export const nowMs = () => Date.now() + offsetMs;
```
`useMyStatus` memanggil `syncServerTime(data.server_now)` setiap kali data datang. `useCountdown(targetIso)` menghitung dari `nowMs()` dan memicu `refetch` status saat hitungan mencapai 0 (agar tombol terbuka/tertutup otomatis). Refetch `my_status` juga tiap 60 detik dan saat tab fokus.

### Format
- Tanggal: `new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'short' })` + suffix " WIB".
- Ukuran file: KB/MB, satu desimal.
- Sanitasi nama untuk ZIP (dipakai admin): ganti `[\\/:*?"<>|]` dengan `-`, rapikan spasi, potong 100 karakter, hapus titik/spasi di ujung.

### Validasi file (klien) — cerminan aturan server
```ts
export async function validatePdf(file: File, maxMb = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 10)) {
  if (!/\.pdf$/i.test(file.name)) return 'File harus berformat PDF.';
  if (file.type && file.type !== 'application/pdf') return 'Tipe file harus PDF.';
  if (file.size === 0) return 'File kosong.';
  if (file.size > maxMb * 1024 * 1024) return `Ukuran maksimal ${maxMb} MB.`;
  const head = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (head !== '%PDF-') return 'Isi file bukan PDF yang valid.';
  return null; // valid
}
```

## 8. Halaman per halaman

### 8.1 Login (`/login`)
- Kartu di tengah: judul "Portal Peserta ACASE 2026", field email + password (tombol lihat password), tombol **Masuk**.
- Tidak ada tautan "Daftar". Teks bantuan: "Akun dibuat oleh panitia. Belum menerima akun atau lupa password? Hubungi panitia via WhatsApp" (tautan `https://wa.me/${VITE_WHATSAPP_CONTACT}`).
- Jika `VITE_ENABLE_PASSWORD_RESET=true`: tautan "Lupa password" memanggil `resetPasswordForEmail(email, { redirectTo: origin + '/#/reset-password' })`. Halaman `/reset-password` memakai event `PASSWORD_RECOVERY` untuk menampilkan form password baru.
- Pesan galat generik: "Email atau password salah." (jangan bocorkan apakah email ada).
- Setelah sukses: arahkan ke `next` atau rute default.
- Tautan kecil ke `/pengumuman` ("Lihat pengumuman publik").

### 8.2 Dashboard (`/dashboard`)
Bagian atas: sapaan "Halo, {nama tim atau kode}" + badge kode tim.

Kartu-kartu:
1. **Checklist tahapan** (ikon centang/jam/kunci):
   - Biodata Tim: `Belum lengkap` / `Lengkap` → tautan.
   - Case Release: `Terkunci` (countdown) / `Tersedia` / `Perlu biodata`.
   - Case Submission: `Belum dikirim` / `Terkirim (waktu)` / `Ditutup`.
   - Pitch Deck (hanya tampil aktif untuk finalis): `Terkunci` / `Belum dikirim` / `Terkirim`.
2. **Tenggat berikutnya**: tahap terdekat yang belum lewat + countdown (hari/jam/menit/detik) berbasis jam server, dan tanggal WIB.
3. **Pengumuman terbaru**: maksimal 3 (pinned dulu), tautan "Lihat semua".
4. **Butuh bantuan?**: tombol WhatsApp panitia + email `asiqugm@gmail.com`.

Bila `must_change_password` di `user_metadata` bernilai true: tampilkan banner "Demi keamanan, ganti password Anda" dengan tautan ke `/profil` (fitur opsional Fase 2).

### 8.3 Biodata (`/biodata`)

**Layout:** satu form panjang dengan langkah-langkah visual.

1. **Data Tim**: `Nama kelompok` (teks 3–60), `Jumlah anggota` (radio 2 / 3; tampilkan peringatan jika mengubah dari 3 ke 2 bahwa data anggota ke-3 akan dihapus).
2. **Anggota 1..N** (kartu): `Nama lengkap`, `NIM`, `Asal kampus`, `Program studi`, `Jenjang` (select D3/D4/S1), `Angkatan` (select tahun 2018 s.d. tahun berjalan+1 atau input 4 digit), `Email`, `No. WhatsApp` (helper: "Contoh: 081234567890 atau +6281234567890"), radio **Ketua tim** (tepat satu; default anggota 1).
3. **Bukti Mahasiswa Aktif (opsional)**: dropzone PDF/JPG/PNG ≤ 2 MB → upload ke `student-proofs/{teamId}/proof.{ext}` lalu `rpc('set_student_proof')`. Tampilkan status "Terunggah".
4. **Persetujuan**: checkbox "Saya menyatakan data benar dan menyetujui ketentuan lomba serta penggunaan data pribadi untuk keperluan penyelenggaraan ASiQ 2026." (teks final dari panitia; tautan ke guidebook `https://drive.google.com/file/d/1ugOsU1DqoYi0yT4Y9vc09Ph-jCTRKj1L/view?us=sharing`).
5. Tombol **Simpan Biodata**.

**Perilaku:**
- Prefill dari `team_members` + `my_status.team` bila sudah pernah disimpan.
- Validasi zod (cerminan aturan DB): 
  - `full_name` 2–100; `nim` 3–30 `[A-Za-z0-9]`; `institution` & `major` 2–100; `degree_level` ∈ {D3,D4,S1}; `batch` `^\d{4}$`; `email` valid; `whatsapp`: hapus spasi/tanda hubung lalu cocokkan `^\+?[0-9]{9,15}$`.
  - Tepat satu `is_leader`. Consent wajib bila `consent_given` masih false.
- Kirim: `rpc('save_team_biodata', { p_name, p_team_size, p_members, p_consent })`. Tampilkan pesan error dari server apa adanya (sudah berbahasa Indonesia) di toast + inline.
- Sukses: toast "Biodata tersimpan", invalidasi `my_status`, tampilkan CTA "Lanjut ke Case Release".
- Jika `biodata_editable=false`: seluruh field disabled + banner "Periode pengisian biodata telah ditutup. Hubungi panitia jika ada koreksi."
- Simpan draft ke `sessionStorage` (bukan server) per perubahan; hapus draft setelah simpan sukses.
- Peringatan "perubahan belum disimpan" saat meninggalkan halaman.

### 8.4 Case Release (`/case`)

State machine (pakai `my_status`):

| Kondisi | Tampilan |
|---|---|
| `stages.case_release.is_open=false` (belum waktunya) | `LockedCard`: ikon gembok, "Case akan dirilis pada {tanggal WIB}", countdown besar |
| Sudah waktunya tetapi `biodata_completed=false` | Kartu peringatan: "Lengkapi biodata tim untuk membuka case." + tombol ke `/biodata` |
| `can_access_case=true` | Daftar materi |

Daftar materi (dari `case_materials` urut `sort_order`): kartu berisi judul, deskripsi, nama file, ukuran, tombol **Unduh**. Klik → `createSignedUrl(path, 60)` → buka `window.open(url)` / anchor download. Tangani galat (mis. "Gagal mengunduh, coba lagi"). Tampilkan catatan "Materi bersifat rahasia dan hanya untuk peserta ACASE 2026."

### 8.5 Case Submission (`/submission`) — `SubmissionPanel stage="case_submission"`

Komponen `SubmissionPanel` (dipakai ulang oleh Pitch Deck) menerima `stage`, judul, teks bantuan, dan `canSubmit`, `stageInfo` dari `my_status`.

**Tampilan:**
- Header: nama tahap, deadline efektif (WIB) + countdown.
- Aturan: "Format PDF, maksimal {N} MB. Anda dapat mengunggah ulang untuk menimpa file sebelumnya sampai tenggat."
- Area utama sesuai keadaan:

| Keadaan | Tampilan |
|---|---|
| Tahap belum dibuka | Kartu terkunci + countdown |
| Biodata belum lengkap | Peringatan + tautan biodata |
| Terbuka, belum ada file | Dropzone aktif |
| Terbuka, sudah ada file | **Bukti**: nama file asli, ukuran, waktu unggah (WIB), badge "Terkirim ✓", tombol "Unduh file saya" dan "Ganti file" |
| Ditutup, ada file | Bukti (read-only), badge "Terkunci" |
| Ditutup, tanpa file | Pesan netral: "Tenggat telah berakhir. Tidak ada berkas yang tercatat." |

**Alur unggah:**
1. Pilih/seret file → `validatePdf`. Bila gagal, tampilkan pesan, hentikan.
2. Tampilkan konfirmasi ("Unggah {nama} ({ukuran})?" — dan bila menimpa: "File sebelumnya akan diganti").
3. `storage.from('submissions').upload(`${teamId}/${stage}/main.pdf`, file, { upsert: true, contentType: 'application/pdf' })` dengan indikator progres (gunakan status "mengunggah…"; progres persen bila tersedia).
4. Setelah sukses: `from('submissions').upsert({ team_id, stage, slot:'main', file_path, file_name: file.name, file_size: file.size }, { onConflict: 'team_id,stage,slot' })`.
5. Refetch daftar submission dan tampilkan bukti. Waktu yang ditampilkan **berasal dari kolom `updated_at` server**, bukan jam klien.
6. Jika langkah 3 sukses tetapi langkah 4 gagal: tampilkan "Berkas terunggah tetapi pencatatan gagal, klik Coba lagi" dengan tombol yang mengulang langkah 4.
7. Galat RLS (`403`/"new row violates row-level security"): "Pengiriman ditolak: tahap sudah ditutup atau Anda belum berhak."

**Lampiran opsional** (hanya jika `VITE_ENABLE_ATTACHMENT=true`): dropzone kedua untuk `attachment.zip`, `slot:'attachment'`, aturan sama (ZIP ≤ batas bucket).

Cegah dobel-klik saat unggah (disable tombol). Peringatkan sebelum menutup tab saat unggah berlangsung.

### 8.6 Pengumuman (`/pengumuman`, publik)
- Bagian **Finalis** (jika `public_finalists` tidak kosong): tabel/grid "Kode · Nama Tim · Kampus" dengan judul "Selamat kepada para finalis ACASE 2026". Jika kosong, sembunyikan bagian.
- Bagian **Pengumuman**: kartu berurut (pinned dulu), badge audiens bila bukan publik ("Khusus Peserta", "Khusus Finalis"), tanggal terbit WIB, isi via `Markdown` aman. Kosong → "Belum ada pengumuman."
- Halaman ini menyesuaikan diri: anon melihat yang publik; peserta login melihat lebih banyak (RLS yang menentukan, frontend tidak memfilter sendiri).

### 8.7 Pitch Deck (`/pitch-deck`)
- Non-finalis (atau finalis belum terpublikasi): `LockedCard` netral "Menu ini akan terbuka bagi tim finalis setelah pengumuman finalis."
- Finalis: `SubmissionPanel stage="pitch_deck"` dengan teks bantuan khusus (deadline pitch deck, format).
- Sebelum `pitch_deck.opens_at`: kartu terkunci + countdown.

### 8.8 Profil (`/profil`)
- Tampilkan email login dan kode tim.
- Form ganti password (baru + konfirmasi, min 8) via `auth.updateUser({ password, data: { must_change_password: false } })`.
- Tombol Keluar.

### 8.9 404 dan error
- 404 ramah dengan tombol kembali. `ErrorBoundary` global dengan pesan dan tombol muat ulang.

## 9. Manajemen state dan data

- `useSession` mendengarkan `onAuthStateChange`; saat `SIGNED_OUT` bersihkan cache React Query.
- Query keys: `['myStatus']`, `['members']`, `['caseMaterials']`, `['submissions']`, `['announcements']`, `['finalists']`, `['stages']`.
- `staleTime` pendek (15 dtk) untuk `myStatus`; `refetchOnWindowFocus: true`.
- Semua mutasi menampilkan toast sukses/gagal dan menginvalidasi kunci terkait.
- Skeleton loading pada setiap halaman; tidak ada layar putih.

## 10. Teks UI (Bahasa Indonesia)

| Kunci | Teks |
|---|---|
| Login gagal | Email atau password salah. |
| Akun nonaktif | Akun tim Anda dinonaktifkan. Silakan hubungi panitia. |
| Case terkunci | Case akan dirilis pada {tanggal} WIB. |
| Biodata belum lengkap | Lengkapi biodata tim terlebih dahulu untuk membuka fitur ini. |
| Submission sukses | Berkas berhasil dikirim. Simpan bukti pengiriman di bawah ini. |
| Tenggat lewat | Tenggat pengumpulan telah berakhir. |
| Ditolak server | Aksi ditolak. Periksa apakah tahap masih dibuka dan biodata sudah lengkap. |
| Jaringan | Koneksi bermasalah. Coba lagi beberapa saat. |

## 11. Aksesibilitas dan kualitas

- Semua input punya `<label>`; error dikaitkan dengan `aria-describedby`; toast memakai `role="status"`/`role="alert"`.
- Navigasi keyboard penuh; dropzone juga punya tombol "Pilih file".
- Jangan mengandalkan warna saja untuk status (tambahkan ikon/teks).
- Tidak ada `dangerouslySetInnerHTML`.
- `npm run build` bebas error TypeScript; `npm run lint` bersih.

## 12. Definition of Done — frontend peserta

- [ ] Semua rute di bagian 4 berfungsi dengan guard yang benar.
- [ ] Biodata: 2 dan 3 anggota, semua validasi, simpan, edit ulang, mode read-only setelah deadline.
- [ ] Case: 3 keadaan terkunci/perlu-biodata/tersedia; unduh via signed URL.
- [ ] Submission: alur lengkap termasuk timpa, bukti, penolakan RLS ditangani.
- [ ] Pengumuman & Finalis publik berfungsi untuk anon dan peserta.
- [ ] Pitch Deck terkunci untuk non-finalis.
- [ ] Countdown mengikuti jam server.
- [ ] Tampilan konsisten dengan tema ASiQ dan responsif 360 px.
- [ ] Tidak ada `service_role` maupun rahasia di bundle.
