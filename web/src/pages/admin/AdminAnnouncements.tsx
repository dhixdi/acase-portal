import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'public' | 'participants' | 'finalists'>('public');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['adminAnnouncements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) { setMsg('Judul dan isi wajib diisi.'); return; }
    setSaving(true); setMsg('');

    const { error } = await supabase.from('announcements').insert({
      title: title.trim(),
      body: body.trim(),
      audience,
      pinned,
      is_published: true,
      published_at: new Date().toISOString(),
    });

    setSaving(false);
    if (error) { setMsg('❌ Gagal: ' + error.message); return; }
    setMsg('✅ Pengumuman berhasil dibuat!');
    setTitle(''); setBody(''); setPinned(false); setAudience('public');
    queryClient.invalidateQueries({ queryKey: ['adminAnnouncements'] });
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase.from('announcements').update({ is_published: !current }).eq('id', id);
    if (error) { alert('Gagal: ' + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['adminAnnouncements'] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus pengumuman ini?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) { alert('Gagal: ' + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['adminAnnouncements'] });
  };

  if (isLoading) return <div>Memuat pengumuman...</div>;

  return (
    <div>
      <h1 className="text-navy">Pengumuman</h1>

      {/* Create form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>Buat Pengumuman Baru</h3>
        {msg && <div style={{ marginBottom: '1rem', padding: '0.5rem', borderRadius: '4px', background: msg.startsWith('✅') ? '#e8f5e9' : '#ffebee', fontSize: '0.9rem' }}>{msg}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input type="text" placeholder="Judul *" value={title} onChange={e => setTitle(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <textarea placeholder="Isi (Markdown) *" value={body} onChange={e => setBody(e.target.value)}
              rows={10} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }} />
            
            <div style={{ padding: '0.5rem', border: '1px solid #eee', borderRadius: '4px', background: '#fafafa', overflowY: 'auto', maxHeight: '250px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Pratinjau</div>
              <div style={{ fontSize: '0.9rem' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{body || '*Mulai ketikkan markdown...*'}</ReactMarkdown>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label>
              Audiens:
              <select value={audience} onChange={e => setAudience(e.target.value as any)} style={{ marginLeft: '0.5rem', padding: '0.3rem' }}>
                <option value="public">Publik (siapa saja)</option>
                <option value="participants">Khusus Peserta</option>
                <option value="finalists">Khusus Finalis</option>
              </select>
            </label>
            <label><input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} /> Pinned</label>
          </div>
          {audience === 'public' && <div style={{ color: '#e65100', fontSize: '0.85rem' }}>⚠️ Akan terlihat oleh siapa saja tanpa login.</div>}
          <button onClick={handleCreate} disabled={saving} className="btn btn-primary">
            {saving ? 'Menyimpan...' : '📢 Terbitkan'}
          </button>
        </div>
      </div>

      {/* List */}
      <h3>Daftar Pengumuman ({announcements?.length ?? 0})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {announcements?.map((a: any) => (
          <div key={a.id} className="card" style={{ borderLeft: `4px solid ${a.is_published ? 'green' : '#ccc'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ margin: 0 }}>{a.title}</h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  {a.is_published ? '🟢 Terbit' : '⚪ Draft'} · {a.audience} {a.pinned ? '· 📌 Pinned' : ''}
                  · {new Date(a.published_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => togglePublish(a.id, a.is_published)} className="btn btn-ghost" style={{ fontSize: '0.75rem' }}>
                  {a.is_published ? 'Tarik' : 'Terbitkan'}
                </button>
                <button onClick={() => handleDelete(a.id)} className="btn btn-ghost" style={{ fontSize: '0.75rem', color: 'red', borderColor: 'red' }}>Hapus</button>
              </div>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#444', whiteSpace: 'pre-wrap' }}>{a.body.slice(0, 200)}{a.body.length > 200 ? '...' : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
