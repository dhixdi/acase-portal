import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export default function AdminSchedule() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: stages, isLoading } = useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stages').select('*').order('opens_at');
      if (error) throw error;
      return data;
    }
  });

  const { data: serverNow } = useQuery({
    queryKey: ['serverNow'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('server_now');
      if (error) throw error;
      return data as string;
    }
  });

  const handleSave = async (key: string, opens_at: string, closes_at: string) => {
    setSaving(true); setMsg('');
    const opensIso = opens_at ? opens_at + ':00+07:00' : null;
    const closesIso = closes_at ? closes_at + ':00+07:00' : null;

    if (closesIso && opensIso && closesIso <= opensIso) {
      setMsg('⚠️ closes_at harus setelah opens_at!'); setSaving(false); return;
    }

    const { error } = await supabase.from('stages').update({
      opens_at: opensIso, closes_at: closesIso
    }).eq('key', key);

    setSaving(false);
    if (error) { setMsg('❌ Gagal: ' + error.message); return; }
    setMsg('✅ Jadwal berhasil disimpan.');
    queryClient.invalidateQueries({ queryKey: ['stages'] });
  };

  if (isLoading) return <div>Memuat jadwal...</div>;

  const toLocal = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const offset = 7 * 60;
    const local = new Date(d.getTime() + offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  return (
    <div>
      <h1 className="text-navy">Jadwal Tahap</h1>
      {serverNow && <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Waktu server: {new Date(serverNow).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>}
      {msg && <div style={{ padding: '0.5rem 1rem', borderRadius: '4px', marginBottom: '1rem', background: msg.startsWith('✅') ? '#e8f5e9' : '#ffebee' }}>{msg}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {stages?.map(s => (
          <StageCard key={s.key} stage={s} saving={saving} toLocal={toLocal} onSave={handleSave} />
        ))}
      </div>
    </div>
  );
}

function StageCard({ stage, saving, toLocal, onSave }: any) {
  const [opens, setOpens] = useState(toLocal(stage.opens_at));
  const [closes, setCloses] = useState(toLocal(stage.closes_at));

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{stage.label} <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>({stage.key})</span></h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold' }}>Dibuka (WIB)</label>
          <input type="datetime-local" value={opens} onChange={e => setOpens(e.target.value)}
            style={{ width: '100%', padding: '0.4rem' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold' }}>Ditutup (WIB)</label>
          <input type="datetime-local" value={closes} onChange={e => setCloses(e.target.value)}
            style={{ width: '100%', padding: '0.4rem' }} />
          {stage.key === 'case_release' && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Kosongkan jika tidak ada batas</span>}
        </div>
      </div>
      <button onClick={() => onSave(stage.key, opens, closes)} disabled={saving}
        className="btn btn-primary" style={{ marginTop: '1rem' }}>
        {saving ? 'Menyimpan...' : 'Simpan'}
      </button>
    </div>
  );
}
