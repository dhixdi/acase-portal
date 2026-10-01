import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Pengumuman() {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: finalists } = useQuery({
    queryKey: ['public_finalists'],
    queryFn: async () => {
      const { data, error } = await supabase.from('public_finalists').select('*');
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div>Memuat pengumuman...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="text-navy">Pengumuman</h1>

      {finalists && finalists.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--gold)' }}>
          <h2 style={{ marginTop: 0, color: 'var(--navy)' }}>🏆 Daftar Finalis ACASE 2026</h2>
          <p>Selamat kepada tim-tim berikut yang berhasil lolos ke tahap Final:</p>
          <ul style={{ lineHeight: '1.8' }}>
            {finalists.map(f => (
              <li key={f.code}>
                <strong>{f.name}</strong> <span style={{ color: 'var(--muted)' }}>({f.institutions})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {announcements?.length === 0 ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '3rem 0' }}>Belum ada pengumuman.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {announcements?.map(a => (
            <div key={a.id} className="card" style={{ borderLeft: a.pinned ? '4px solid var(--gold)' : 'none' }}>
              <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                {a.pinned && '📌 '} {a.title}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                <span style={{ 
                  background: a.audience === 'public' ? '#e3f2fd' : (a.audience === 'finalists' ? '#f3e5f5' : '#e8f5e9'), 
                  padding: '0.15rem 0.4rem', 
                  borderRadius: '4px',
                  color: '#333'
                }}>
                  {a.audience === 'public' ? 'Publik' : (a.audience === 'finalists' ? 'Finalis' : 'Peserta')}
                </span>
                <span style={{ marginLeft: '0.5rem' }}>
                  {new Date(a.published_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                </span>
              </div>
              
              <div style={{ lineHeight: '1.6', color: '#333' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.body}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
