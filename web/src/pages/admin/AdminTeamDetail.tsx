import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useState } from 'react';

export default function AdminTeamDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');

  const { data: team, isLoading } = useQuery({
    queryKey: ['adminTeam', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_team_overview').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
  });

  const { data: members } = useQuery({
    queryKey: ['adminTeamMembers', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('*').eq('team_id', id).order('member_no');
      if (error) throw error;
      return data;
    }
  });

  useQuery({
    queryKey: ['adminTeamNote', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_admin_notes').select('note').eq('team_id', id).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      setNote(data?.note || '');
      return data;
    }
  });

  const { data: submissions } = useQuery({
    queryKey: ['adminTeamSubmissions', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('submissions').select('*').eq('team_id', id);
      if (error) throw error;
      return data;
    }
  });

  const toggleStatus = async (field: 'is_active' | 'payment_verified', current: boolean) => {
    if (field === 'is_active' && current) {
      if (!confirm('Yakin menonaktifkan akun ini? Peserta tidak akan bisa mengakses portal.')) return;
    }
    await supabase.from('teams').update({ [field]: !current }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['adminTeam', id] });
    queryClient.invalidateQueries({ queryKey: ['adminTeams'] });
  };

  const saveNote = async () => {
    await supabase.from('team_admin_notes').upsert({ team_id: id, note });
    queryClient.invalidateQueries({ queryKey: ['adminTeamNote', id] });
    alert('Catatan disimpan');
  };

  if (isLoading) return <div>Memuat detail tim...</div>;
  if (!team) return <div>Tim tidak ditemukan.</div>;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/admin/teams" style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>← Kembali ke Daftar Tim</Link>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-navy" style={{ margin: 0 }}>{team.code} — {team.name || '(Belum Biodata)'}</h1>
          <div style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>Login: {team.login_email}</div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => toggleStatus('is_active', team.is_active)} className={`btn ${team.is_active ? 'btn-ghost' : 'btn-primary'}`}>
            {team.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
          </button>
          <button onClick={() => toggleStatus('payment_verified', team.payment_verified)} className="btn btn-ghost">
            Pembayaran: {team.payment_verified ? '✅ Lunas' : '❌ Belum'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Kolom Kiri */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Biodata Tim</h3>
            {!team.biodata_completed_at ? (
              <p style={{ color: 'var(--muted)' }}>Belum dilengkapi oleh peserta.</p>
            ) : (
              <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {members?.map(m => (
                  <div key={m.id} style={{ paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                    <strong>Anggota {m.member_no} {m.is_leader ? '(Ketua)' : ''}</strong><br/>
                    {m.full_name} ({m.nim})<br/>
                    {m.institution} - {m.degree_level} {m.major} '{m.batch}<br/>
                    📱 {m.whatsapp} ✉️ {m.email}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Catatan Internal (Admin)</h3>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '0.5rem' }} />
            <button onClick={saveNote} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Simpan Catatan</button>
          </div>
        </div>

        {/* Kolom Kanan */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Berkas Submission</h3>
            {submissions?.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>Belum ada berkas yang diunggah.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                {submissions?.map(s => (
                  <li key={s.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                    <strong>Tahap:</strong> {s.stage} ({s.slot})<br/>
                    <strong>File:</strong> {s.file_name} ({Math.round(s.file_size / 1024)} KB)<br/>
                    <strong>Waktu:</strong> {new Date(s.updated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}<br/>
                    <button onClick={async () => {
                      const { data } = await supabase.storage.from('submissions').createSignedUrl(s.file_path, 60);
                      if (data?.signedUrl) window.open(data.signedUrl);
                    }} className="btn btn-ghost" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Unduh</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Override Deadline</h3>
            <OverrideDeadlineForm teamId={id!} />
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Riwayat Unggahan</h3>
            <SubmissionEvents teamId={id!} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Komponen Pembantu
function OverrideDeadlineForm({ teamId }: { teamId: string }) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState('case_submission');
  const [closesAt, setClosesAt] = useState('');
  const [note, setOverrideNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: overrides, isLoading } = useQuery({
    queryKey: ['adminTeamOverrides', teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from('deadline_overrides').select('*').eq('team_id', teamId);
      if (error) throw error;
      return data;
    }
  });

  const handleSave = async () => {
    if (!closesAt) return alert('Pilih waktu penutupan.');
    setSaving(true);
    const { error } = await supabase.from('deadline_overrides').upsert({
      team_id: teamId,
      stage,
      closes_at: closesAt + ':00+07:00',
      note
    });
    setSaving(false);
    if (error) alert('Gagal: ' + error.message);
    else {
      setClosesAt(''); setOverrideNote('');
      queryClient.invalidateQueries({ queryKey: ['adminTeamOverrides', teamId] });
      alert('Override disimpan.');
    }
  };

  const handleDelete = async (stageKey: string) => {
    if (!confirm('Hapus override deadline ini?')) return;
    await supabase.from('deadline_overrides').delete().eq('team_id', teamId).eq('stage', stageKey);
    queryClient.invalidateQueries({ queryKey: ['adminTeamOverrides', teamId] });
  };

  return (
    <div>
      {isLoading ? <div>Memuat...</div> : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0', fontSize: '0.85rem' }}>
          {overrides?.length === 0 && <li style={{ color: 'var(--muted)' }}>Tidak ada override aktif.</li>}
          {overrides?.map(o => (
            <li key={o.stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#fff3cd', marginBottom: '0.5rem', borderRadius: '4px' }}>
              <div>
                <strong>{o.stage}</strong>: {new Date(o.closes_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}<br/>
                <span style={{ color: '#666' }}>{o.note}</span>
              </div>
              <button onClick={() => handleDelete(o.stage)} className="btn btn-ghost" style={{ color: 'red', padding: '0.2rem 0.5rem' }}>Hapus</button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
        <select value={stage} onChange={e => setStage(e.target.value)} style={{ padding: '0.4rem' }}>
          <option value="case_submission">Case Submission</option>
          <option value="pitch_deck">Pitch Deck</option>
        </select>
        <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} style={{ padding: '0.4rem' }} />
        <input type="text" placeholder="Catatan (opsional)" value={note} onChange={e => setOverrideNote(e.target.value)} style={{ padding: '0.4rem' }} />
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: '0.4rem' }}>{saving ? 'Menyimpan...' : 'Set Override'}</button>
      </div>
    </div>
  );
}

function SubmissionEvents({ teamId }: { teamId: string }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['adminTeamEvents', teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from('submission_events').select('*').eq('team_id', teamId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div style={{ fontSize: '0.85rem' }}>Memuat riwayat...</div>;
  if (events?.length === 0) return <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Belum ada riwayat aktivitas berkas.</div>;

  return (
    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
      <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
            <th style={{ padding: '0.4rem' }}>Waktu</th>
            <th style={{ padding: '0.4rem' }}>Tahap</th>
            <th style={{ padding: '0.4rem' }}>Aksi</th>
            <th style={{ padding: '0.4rem' }}>Ukuran</th>
          </tr>
        </thead>
        <tbody>
          {events?.map(ev => (
            <tr key={ev.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.4rem' }}>{new Date(ev.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
              <td style={{ padding: '0.4rem' }}>{ev.stage} ({ev.slot})</td>
              <td style={{ padding: '0.4rem' }}>
                <span style={{ 
                  color: ev.action === 'upload' ? 'green' : ev.action === 'delete' ? 'red' : 'orange' 
                }}>{ev.action.toUpperCase()}</span>
              </td>
              <td style={{ padding: '0.4rem' }}>{ev.file_size ? `${Math.round(ev.file_size / 1024)} KB` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
