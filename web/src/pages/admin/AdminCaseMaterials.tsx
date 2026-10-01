import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export default function AdminCaseMaterials() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['adminCaseMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('case_materials').select('*').order('sort_order');
      if (error) throw error;
      return data;
    }
  });

  const { data: stages } = useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stages').select('*');
      if (error) throw error;
      return data;
    }
  });

  const caseRelease = stages?.find(s => s.key === 'case_release');

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { setMsg('Pilih file terlebih dahulu.'); return; }
    if (!title.trim()) { setMsg('Judul wajib diisi.'); return; }

    setUploading(true); setMsg('');

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${crypto.randomUUID()}-${safeName}`;

      const { error: storageError } = await supabase.storage
        .from('case-files')
        .upload(filePath, file);

      if (storageError) throw new Error(storageError.message);

      const maxOrder = materials?.reduce((max, m) => Math.max(max, m.sort_order), 0) ?? 0;

      const { error: dbError } = await supabase.from('case_materials').insert({
        title: title.trim(),
        description: description.trim() || null,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        sort_order: maxOrder + 1,
      });

      if (dbError) throw new Error(dbError.message);

      setMsg('✅ Materi berhasil ditambahkan!');
      setTitle(''); setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['adminCaseMaterials'] });
    } catch (err: any) {
      setMsg('❌ Gagal: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm('Yakin hapus materi ini?')) return;

    await supabase.storage.from('case-files').remove([filePath]);
    const { error } = await supabase.from('case_materials').delete().eq('id', id);
    if (error) { alert('Gagal menghapus: ' + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['adminCaseMaterials'] });
  };

  const handleDownload = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('case-files').createSignedUrl(filePath, 60);
    if (error) { alert('Gagal: ' + error.message); return; }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const moveOrder = async (id: string, currentOrder: number, direction: -1 | 1) => {
    if (!materials) return;
    const currentIndex = materials.findIndex(m => m.id === id);
    if (currentIndex < 0) return;
    
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= materials.length) return;
    
    const targetMaterial = materials[targetIndex];
    
    // Swap sort_order
    await supabase.from('case_materials').update({ sort_order: targetMaterial.sort_order }).eq('id', id);
    await supabase.from('case_materials').update({ sort_order: currentOrder }).eq('id', targetMaterial.id);
    
    queryClient.invalidateQueries({ queryKey: ['adminCaseMaterials'] });
  };

  if (isLoading) return <div>Memuat materi case...</div>;

  return (
    <div>
      <h1 className="text-navy">Materi Case</h1>

      {caseRelease && (
        <div style={{ background: '#fff3cd', padding: '0.75rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#856404' }}>
          ⚠️ File akan otomatis terkunci untuk peserta sampai <strong>{new Date(caseRelease.opens_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</strong>.
          Unggah file sebelum waktu rilis; RLS mencegah kebocoran.
        </div>
      )}

      {/* Upload form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>Tambah Materi</h3>
        {msg && <div style={{ marginBottom: '1rem', padding: '0.5rem', borderRadius: '4px', background: msg.startsWith('✅') ? '#e8f5e9' : '#ffebee', fontSize: '0.9rem' }}>{msg}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input type="text" placeholder="Judul materi *" value={title} onChange={e => setTitle(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
          <input type="text" placeholder="Deskripsi (opsional)" value={description} onChange={e => setDescription(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
          <input type="file" ref={fileInputRef} accept=".pdf,.zip,.csv,.xlsx"
            style={{ padding: '0.5rem' }} />
          <button onClick={handleUpload} disabled={uploading} className="btn btn-primary">
            {uploading ? 'Mengunggah...' : '📤 Unggah Materi'}
          </button>
        </div>
      </div>

      {/* List */}
      <h3>Materi Terdaftar ({materials?.length ?? 0})</h3>
      {materials?.length === 0
        ? <p style={{ color: 'var(--muted)' }}>Belum ada materi. Unggah di atas.</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {materials?.map((m: any, idx: number) => (
              <div key={m.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong>{idx + 1}. {m.title}</strong>
                  {m.description && <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{m.description}</div>}
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>{m.file_name} · {Math.round((m.file_size || 0) / 1024)} KB</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => moveOrder(m.id, m.sort_order, -1)} disabled={idx === 0} className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>⬆️</button>
                  <button onClick={() => moveOrder(m.id, m.sort_order, 1)} disabled={idx === materials.length - 1} className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>⬇️</button>
                  <button onClick={() => handleDownload(m.file_path)} className="btn btn-ghost" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>Unduh</button>
                  <button onClick={() => handleDelete(m.id, m.file_path)} className="btn btn-ghost" style={{ fontSize: '0.8rem', color: 'red', borderColor: 'red' }}>Hapus</button>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}
