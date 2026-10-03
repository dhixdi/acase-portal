# AGENT_TASK: Fix form Biodata ter-reset saat pindah tab

Dokumen ini adalah instruksi untuk AI coding agent (Claude Code, Cursor, Copilot, dll). Baca seluruhnya sebelum mengubah kode.

## Konteks proyek

- Portal peserta lomba ACASE 2026.
- Frontend: `web/` (Vite + React 19 + TypeScript, react-hook-form, TanStack Query, react-hot-toast).
- Backend: Supabase (RPC `save_team_biodata`, `my_status`). **Tidak ada perubahan database.**
- Deploy: GitHub Pages lewat `.github/workflows/deploy.yml` saat push ke `main`.

## Masalah

Laporan user: saat mengisi biodata lalu pindah tab dan kembali, **semua data hilang** dan tombol "Simpan Final" tidak bisa digunakan.

## Akar masalah

1. `web/src/main.tsx` memakai `refetchOnWindowFocus: true`. Setiap tab kembali fokus, `useMyStatus()` melakukan refetch dan `status` mendapat referensi objek baru.
2. Di `web/src/pages/Biodata.tsx`, `useEffect(() => { ... reset({...}) }, [status, reset])` berjalan ulang setiap `status` berubah, sehingga seluruh isian form di-reset ke nilai awal (kosong).
3. Form memakai `handleSubmit(onSubmit)` tanpa handler error dan atribut `required` native, jadi saat field kosong submit gagal tanpa pesan apa pun.
4. `onSubmit` tidak memakai `try/finally`, sehingga `saving` bisa tersangkut `true` jika request melempar exception.

## Lingkup perubahan

Hanya dua file:

- `web/src/hooks/useMyStatus.ts`
- `web/src/pages/Biodata.tsx`

Jangan ubah file lain, jangan ubah migrasi SQL, jangan ubah `main.tsx` (refetch saat fokus tetap dibutuhkan halaman lain).

## Langkah 1: `web/src/hooks/useMyStatus.ts`

Tambahkan parameter kedua `refetchOnFocus` (default `true` agar perilaku halaman lain tidak berubah):

```ts
export function useMyStatus(enabled: boolean = true, refetchOnFocus: boolean = true) {
  return useQuery({
    queryKey: ['myStatus'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_status');
      if (error) throw error;
      return data as MyStatus;
    },
    enabled,
    refetchOnWindowFocus: refetchOnFocus,
  });
}
```

## Langkah 2: `web/src/pages/Biodata.tsx`

### 2a. Import dan pemanggilan hook

```tsx
import { useState, useEffect, useRef } from "react";
```

```tsx
const { data: status, isLoading } = useMyStatus(true, false);
```

### 2b. Restore draft, lalu reset dari server hanya sekali

Tambahkan setelah `useForm(...)`. **Urutan effect penting**: effect restore draft harus dideklarasikan **sebelum** effect reset dari `status`.

```tsx
const DRAFT_KEY = "biodata_draft";
const initialized = useRef(false);

// 1) Pulihkan draft (jika ada)
useEffect(() => {
  if (initialized.current) return;
  const saved = sessionStorage.getItem(DRAFT_KEY);
  if (saved) {
    try {
      reset(JSON.parse(saved));
      initialized.current = true;
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }
}, [reset]);

// 2) Simpan draft setiap ada perubahan (consent selalu false)
useEffect(() => {
  const sub = watch((value) => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...value, consent: false }));
    } catch {}
  });
  return () => sub.unsubscribe();
}, [watch]);
```

Ubah effect reset yang sudah ada menjadi hanya berjalan sekali:

```tsx
useEffect(() => {
  if (!status?.team || initialized.current) return;
  initialized.current = true;
  // ...isi reset({...}) TETAP SAMA seperti kode sekarang
}, [status, reset]);
```

### 2c. Validasi: beri feedback dan matikan validasi native

```tsx
const onInvalid = (errors: any) => {
  if (errors.consent) toast.error("Centang persetujuan terlebih dahulu.");
  else toast.error("Masih ada isian yang belum valid. Periksa kembali semua langkah.");
};
```

```tsx
<form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="card">
```

### 2d. `onSubmit` dengan try/catch/finally

```tsx
const onSubmit = async (data: BiodataForm) => {
  if (!isEditable) return;
  setSaving(true);
  try {
    const formattedMembers = data.members.map((m) => ({
      ...m,
      whatsapp: "+62" + m.whatsapp.replace(/\D/g, "").replace(/^62/, "").replace(/^0/, ""),
    }));

    const { error } = await supabase.rpc("save_team_biodata", {
      p_name: data.name,
      p_team_size: data.team_size,
      p_members: formattedMembers,
      p_consent: data.consent,
    });

    if (error) {
      toast.error("Gagal menyimpan: " + error.message, { duration: 8000 });
    } else {
      sessionStorage.removeItem(DRAFT_KEY);
      toast.success("Biodata berhasil disimpan!");
      navigate("/profile");
    }
  } catch (e: any) {
    toast.error("Koneksi bermasalah: " + e.message);
  } finally {
    setSaving(false);
  }
};
```

### 2e. Longgarkan pola WhatsApp

Di `register(\`members.${index}.whatsapp\`, {...})` ganti pola menjadi:

```tsx
pattern: /^[0-9\s\-]{8,18}$/
```

Nilai dibersihkan lagi saat submit (lihat 2d), dan server tetap memvalidasi `^\+?[0-9]{9,15}$`.

### 2f. Bersihkan draft jika biodata sudah final

Pada effect yang me-redirect ke `/profile` ketika `status.team.biodata_completed`, tambahkan `sessionStorage.removeItem("biodata_draft")` sebelum `navigate(...)`.

## Aturan

- Pertahankan gaya kode yang ada (inline style, teks Indonesia).
- Jangan menambah dependency baru.
- Jangan menghapus atau mengubah validasi di sisi server.
- Jangan mengubah teks peringatan "TIDAK DAPAT DIUBAH LAGI".
- Jangan commit file `.env` atau kredensial.

## Kriteria selesai (acceptance)

1. `cd web && npm run build` sukses tanpa error TypeScript (`noUnusedLocals` aktif, pastikan tidak ada variabel yang tak terpakai).
2. Isi step 1 dan 2, pindah tab 10+ detik, kembali: **semua isian masih ada**.
3. Refresh halaman di tengah pengisian: isian pulih dari draft, checkbox persetujuan kembali tidak tercentang.
4. Submit dengan checkbox kosong: muncul toast "Centang persetujuan terlebih dahulu.", bukan diam.
5. Submit dengan WhatsApp `0812-3456-7890`: berhasil, tersimpan sebagai `+6281234567890` (tanpa spasi/strip).
6. Matikan jaringan lalu submit: muncul toast "Koneksi bermasalah", tombol kembali aktif.
7. Setelah simpan sukses: redirect ke `/profile` dan draft di `sessionStorage` terhapus.
8. Halaman lain (Dashboard, Case, Submission) tetap refetch saat fokus seperti semula.

## Deploy

```bash
cd web
npm run build
git add web/src/hooks/useMyStatus.ts web/src/pages/Biodata.tsx
git commit -m "fix: biodata form reset on tab focus, add draft and validation feedback"
git push origin main
```

Setelah deploy, minta user yang melapor melakukan hard refresh (Ctrl+Shift+R) dan memberi tahu bahwa isian yang sempat hilang perlu diisi ulang sekali.
