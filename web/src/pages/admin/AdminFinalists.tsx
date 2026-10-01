import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export default function AdminFinalists() {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [msg, setMsg] = useState('');

  const { data: teams, isLoading } = useQuery({
    queryKey: ['adminTeams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_team_overview').select('*').order('code');
      if (error) throw error;
      return data;
    }
  });

  const { data: finalists, isLoading: finLoading } = useQuery({
    queryKey: ['adminFinalists'],
    queryFn: async () => {
      const { data, error } = await supabase.from('finalists').select('*');
      if (error) throw error;
      return data;
    }
  });

  const isFinalist = (teamId: string) => finalists?.some(f => f.team_id === teamId);
  const isPublished = (teamId: string) => finalists?.find(f => f.team_id === teamId)?.published;

  const toggleFinalist = async (teamId: string) => {
    if (isFinalist(teamId)) {
      if (!confirm('Cabut status finalis tim ini?')) return;
      const { error } = await supabase.from('finalists').delete().eq('team_id', teamId);
      if (error) { alert('Gagal: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('finalists').insert({ team_id: teamId, published: false });
      if (error) { alert('Gagal: ' + error.message); return; }
    }
    queryClient.invalidateQueries({ queryKey: ['adminFinalists'] });
    queryClient.invalidateQueries({ queryKey: ['adminTeams'] });
  };

  const [autoAnnounce, setAutoAnnounce] = useState(true);

  const publishAll = async () => {
    if (confirmText !== 'PUBLIKASI') { setMsg('Ketik PUBLIKASI untuk konfirmasi.'); return; }
    
    const { data: user } = await supabase.auth.getUser();
    
    // 1. Update published status
    const { error } = await supabase.from('finalists').update({ published: true }).eq('published', false);
    if (error) { setMsg('❌ Gagal: ' + error.message); return; }
    
    // 2. Auto-announce if checked
    if (autoAnnounce) {
      await supabase.from('announcements').insert({
        title: 'Pengumuman Finalis ACASE 2026',
        body: 'Selamat kepada tim-tim yang telah lolos ke tahap final! Silakan persiapkan Pitch Deck Anda dan unggah melalui portal.',
        audience: 'finalists',
        pinned: true,
        is_published: true,
        published_at: new Date().toISOString(),
      });
    }

    // 3. Audit log
    await supabase.from('audit_log').insert({
      actor: user.user?.id,
      action: 'finalists_published',
      details: { auto_announce: autoAnnounce }
    });

    setMsg('✅ Semua finalis berhasil dipublikasikan!');
    setConfirmText('');
    queryClient.invalidateQueries({ queryKey: ['adminFinalists'] });
    queryClient.invalidateQueries({ queryKey: ['adminTeams'] });
  };

  const unpublishAll = async () => {
    if (!confirm('Tarik publikasi semua finalis?')) return;
    const { error } = await supabase.from('finalists').update({ published: false }).eq('published', true);
    if (error) { alert('Gagal: ' + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['adminFinalists'] });
  };

  if (isLoading || finLoading) return <div>Memuat data...</div>;

  const finalistTeams = teams?.filter(t => isFinalist(t.id)) ?? [];
  const nonFinalists = teams?.filter(t => !isFinalist(t.id) && t.is_active) ?? [];

  return (
    <div>
      <h1 className="text-navy">Kelola Finalis</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left: all teams */}
        <div>
          <h3>Tim Aktif ({nonFinalists.length})</h3>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {nonFinalists.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #eee', fontSize: '0.85rem' }}>
                <span><strong>{t.code}</strong> — {t.name || '-'}</span>
                <button onClick={() => toggleFinalist(t.id)} className="btn btn-ghost" style={{ fontSize: '0.75rem' }}>+ Tandai</button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: finalists */}
        <div>
          <h3>Finalis ({finalistTeams.length})</h3>
          {finalistTeams.length === 0
            ? <p style={{ color: 'var(--muted)' }}>Belum ada finalis.</p>
            : <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {finalistTeams.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #eee', fontSize: '0.85rem' }}>
                    <span>
                      <strong>{t.code}</strong> — {t.name || '-'}
                      {isPublished(t.id) ? <span style={{ color: 'green', marginLeft: '0.5rem' }}>🟢 Terpublikasi</span> : <span style={{ color: '#999', marginLeft: '0.5rem' }}>⚪ Draft</span>}
                    </span>
                    <button onClick={() => toggleFinalist(t.id)} className="btn btn-ghost" style={{ fontSize: '0.75rem', color: 'red', borderColor: 'red' }}>Cabut</button>
                  </div>
                ))}
              </div>
          }

          {finalistTeams.length > 0 && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <h4 style={{ marginTop: 0 }}>Publikasi Finalis</h4>
              {msg && <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: msg.startsWith('✅') ? 'green' : 'red' }}>{msg}</div>}
              <p style={{ fontSize: '0.85rem' }}>Ketik <strong>PUBLIKASI</strong> untuk mengkonfirmasi:</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                  placeholder="Ketik PUBLIKASI" style={{ padding: '0.4rem', flex: 1 }} />
                <button onClick={publishAll} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Publikasikan</button>
              </div>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={autoAnnounce} onChange={e => setAutoAnnounce(e.target.checked)} />
                Buat pengumuman otomatis untuk finalis
              </label>
              {finalistTeams.some(t => isPublished(t.id)) && (
                <button onClick={unpublishAll} className="btn btn-ghost" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>Tarik Semua Publikasi</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
