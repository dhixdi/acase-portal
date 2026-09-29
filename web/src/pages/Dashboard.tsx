import { useSession } from '../hooks/useSession';
import { useMyStatus } from '../hooks/useMyStatus';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { session } = useSession();
  const { data: status, isLoading, error } = useMyStatus(!!session);

  if (isLoading) return <div>Memuat data tim...</div>;
  if (error) return <div style={{ color: 'red' }}>Gagal memuat status.</div>;
  if (!status?.has_team) return <div>Akun Anda belum terkait dengan tim mana pun.</div>;

  const team = status.team!;

  if (!team.is_active) {
    return (
      <div className="card" style={{ borderLeft: '4px solid red' }}>
        <h2 style={{ marginTop: 0 }}>Akun Nonaktif</h2>
        <p>Akun tim Anda dinonaktifkan. Silakan hubungi panitia untuk informasi lebih lanjut.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-navy">Selamat Datang, {team.name || team.code}</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Status Tim</h3>
          <ul style={{ listStyle: 'none', padding: 0, lineHeight: '1.8' }}>
            <li>
              {team.biodata_completed ? '✅' : '❌'} 
              <Link to="/biodata" style={{ marginLeft: '0.5rem' }}>Biodata {team.biodata_completed ? 'Lengkap' : 'Belum Lengkap'}</Link>
            </li>
            <li>
              {status.can_access_case ? '✅' : '🔒'} 
              <Link to="/case" style={{ marginLeft: '0.5rem' }}>Akses Materi Case</Link>
            </li>
            <li>
              {status.can_submit_case ? '✅' : '🔒'} 
              <Link to="/submission" style={{ marginLeft: '0.5rem', color: status.can_submit_case ? 'var(--gold)' : 'var(--muted)' }}>Pengumpulan Case</Link>
            </li>
          </ul>
        </div>

        <div className="card bg-navy">
          <h3 style={{ marginTop: 0, color: 'var(--gold)' }}>Bantuan</h3>
          <p>Jika ada kendala, hubungi panitia melalui:</p>
          <p>WhatsApp: <strong>+62 812-xxxx-xxxx</strong></p>
          <p>Email: <strong>asiqugm@gmail.com</strong></p>
        </div>
      </div>
    </div>
  );
}
