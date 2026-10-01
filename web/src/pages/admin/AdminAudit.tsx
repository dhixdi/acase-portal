import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export default function AdminAudit() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div>Memuat audit log...</div>;

  return (
    <div>
      <h1 className="text-navy">Audit Log</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Menampilkan 200 aktivitas terakhir sistem.</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: '1rem', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead><tr style={{ background: 'var(--navy)', color: 'white' }}>
          <th style={th}>Waktu (WIB)</th>
          <th style={th}>Aksi</th>
          <th style={th}>Entitas</th>
          <th style={th}>Aktor (UUID)</th>
          <th style={th}>Detail</th>
        </tr></thead>
        <tbody>
          {logs?.map((log: any) => (
            <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={td}>{new Date(log.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
              <td style={td}><strong style={{ color: 'var(--navy)' }}>{log.action}</strong></td>
              <td style={td}>{log.entity} {log.entity_id ? `(#${log.entity_id})` : ''}</td>
              <td title={log.actor} style={{...td, fontFamily: 'monospace', color: '#666'}}>
                {log.actor ? log.actor.slice(0, 8) + '...' : 'System'}
              </td>
              <td style={td}>
                {log.details ? (
                  <pre style={{ margin: 0, fontSize: '0.75rem', background: '#f5f5f5', padding: '0.4rem', borderRadius: '4px', overflowX: 'auto' }}>
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                ) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' };
const td: React.CSSProperties = { padding: '0.75rem', verticalAlign: 'top' };
