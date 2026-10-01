import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ['adminTeams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_team_overview').select('*');
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

  if (isLoading) return <div>Memuat dashboard admin...</div>;

  const total = teams?.length ?? 0;
  const biodataComplete = teams?.filter(t => t.biodata_completed_at).length ?? 0;
  const caseSubmitted = teams?.filter(t => t.case_submitted_at).length ?? 0;
  const inactive = teams?.filter(t => !t.is_active).length ?? 0;
  const finalistCount = teams?.filter(t => t.is_finalist).length ?? 0;

  return (
    <div>
      <h1 className="text-navy">Dashboard Admin</h1>
      {serverNow && <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Waktu server: {new Date(serverNow).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        <StatCard label="Total Tim" value={total} />
        <StatCard label="Biodata Lengkap" value={`${biodataComplete} / ${total}`} color={biodataComplete === total ? 'green' : '#e65100'} />
        <StatCard label="Sudah Submit Case" value={`${caseSubmitted} / ${total}`} color={caseSubmitted === total ? 'green' : '#e65100'} />
        <StatCard label="Akun Nonaktif" value={inactive} color={inactive > 0 ? 'red' : 'green'} />
        <StatCard label="Finalis" value={finalistCount} />
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Tim Belum Biodata</h3>
        {teams?.filter(t => !t.biodata_completed_at && t.is_active).length === 0
          ? <p style={{ color: 'var(--muted)' }}>Semua tim sudah melengkapi biodata 🎉</p>
          : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--navy)', color: 'white' }}>
                <th style={th}>Kode</th><th style={th}>Email</th><th style={th}>WhatsApp Ketua</th>
              </tr></thead>
              <tbody>
                {teams?.filter(t => !t.biodata_completed_at && t.is_active).map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={td}>{t.code}</td><td style={td}>{t.login_email}</td><td style={td}>{t.leader_whatsapp || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Tim Belum Submit Case</h3>
        {teams?.filter(t => !t.case_submitted_at && t.is_active).length === 0
          ? <p style={{ color: 'var(--muted)' }}>Semua tim sudah submit 🎉</p>
          : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--navy)', color: 'white' }}>
                <th style={th}>Kode</th><th style={th}>Nama</th><th style={th}>WhatsApp Ketua</th>
              </tr></thead>
              <tbody>
                {teams?.filter(t => !t.case_submitted_at && t.is_active).map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={td}>{t.code}</td><td style={td}>{t.name || '-'}</td><td style={td}>{t.leader_whatsapp || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color || 'var(--navy)' }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '0.5rem', textAlign: 'left', fontSize: '0.85rem' };
const td: React.CSSProperties = { padding: '0.5rem', fontSize: '0.85rem' };
