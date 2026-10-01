import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function AdminTeams() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  
  const { data: teams, isLoading } = useQuery({
    queryKey: ['adminTeams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_team_overview').select('*').order('code');
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div>Memuat data tim...</div>;

  const filtered = teams?.filter(t => {
    const s = search.toLowerCase();
    if (!s) return true;
    return (t.code?.toLowerCase().includes(s) ||
            t.name?.toLowerCase().includes(s) ||
            t.login_email?.toLowerCase().includes(s) ||
            t.leader_name?.toLowerCase().includes(s) ||
            t.institutions?.toLowerCase().includes(s));
  }) ?? [];

  const exportCSV = async () => {
    const { data: members, error } = await supabase.from('team_members').select('*').order('team_id').order('member_no');
    if (error) { alert('Gagal mengambil data: ' + error.message); return; }

    const header = 'Kode Tim,Nama Kelompok,Kategori,No,Ketua,Nama,NIM,Kampus,Prodi,Jenjang,Angkatan,Email,WhatsApp';
    const rows = members.map(m => {
      const team = teams?.find(t => t.id === m.team_id);
      return [team?.code, team?.name, team?.category, m.member_no, m.is_leader ? 'Ya' : '', m.full_name, m.nim, m.institution, m.major, m.degree_level, m.batch, m.email, m.whatsapp]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',');
    });

    const bom = '\uFEFF';
    const csv = bom + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `biodata-acase-${new Date().toISOString().slice(0,10).replace(/-/g,'')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const generateNewAccount = async () => {
    if (!confirm('Buat akun peserta (tim) baru secara otomatis?')) return;
    const { data, error } = await supabase.rpc('admin_create_team');
    if (error) {
      alert('Gagal membuat akun: ' + error.message);
      return;
    }
    alert(`BERHASIL DIBUAT!\n\nUsername: ${data.username}\nPassword: ${data.password}\n\nMohon catat password ini, karena tidak bisa dilihat lagi.`);
    queryClient.invalidateQueries({ queryKey: ['adminTeams'] });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 className="text-navy" style={{ margin: 0 }}>Daftar Tim ({filtered.length})</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={generateNewAccount} className="btn btn-ghost" style={{ background: '#e8f5e9', color: 'green', borderColor: 'green' }}>+ Akun Baru</button>
          <button onClick={exportCSV} className="btn btn-primary">Ekspor Biodata CSV</button>
        </div>
      </div>

      <input
        type="text" placeholder="Cari kode, nama, email, kampus..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
      />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead><tr style={{ background: 'var(--navy)', color: 'white' }}>
            <th style={th}>Kode</th><th style={th}>Nama</th><th style={th}>Kampus</th>
            <th style={th}>Ketua</th><th style={th}>Kategori</th><th style={th}>Bayar</th>
            <th style={th}>Biodata</th><th style={th}>Case Submit</th><th style={th}>Aktif</th>
            <th style={th}>Aksi</th>
          </tr></thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #eee', background: t.is_active ? 'white' : '#fff5f5' }}>
                <td style={td}><strong>{t.code}</strong></td>
                <td style={td}>{t.name || <span style={{ color: 'var(--muted)' }}>-</span>}</td>
                <td style={td}>{t.institutions || '-'}</td>
                <td style={td}>{t.leader_name || '-'}</td>
                <td style={td}><span style={{ padding: '0.15rem 0.4rem', background: t.category === 'early_bird' ? '#e3f2fd' : '#f5f5f5', borderRadius: '4px', fontSize: '0.8rem' }}>{t.category}</span></td>
                <td style={td}>{t.payment_verified ? '✅' : '❌'}</td>
                <td style={td}>{t.biodata_completed_at ? '✅' : '❌'}</td>
                <td style={td}>{t.case_submitted_at ? new Date(t.case_submitted_at).toLocaleDateString('id-ID') : '❌'}</td>
                <td style={td}>{t.is_active ? '✅' : '❌'}</td>
                <td style={td}><Link to={`/admin/teams/${t.id}`} style={{ fontSize: '0.8rem' }}>Detail</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '0.5rem', textAlign: 'left', fontSize: '0.8rem' };
const td: React.CSSProperties = { padding: '0.5rem' };
