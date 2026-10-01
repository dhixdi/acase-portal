import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const NAV_ITEMS = [
  { to: '/admin', label: '📊 Dashboard', exact: true },
  { to: '/admin/teams', label: '👥 Tim' },
  { to: '/admin/schedule', label: '📅 Jadwal' },
  { to: '/admin/case-materials', label: '📁 Materi Case' },
  { to: '/admin/submissions', label: '📄 Submission Case' },
  { to: '/admin/pitch-decks', label: '📽️ Pitch Deck' },
  { to: '/admin/announcements', label: '📢 Pengumuman' },
  { to: '/admin/finalists', label: '🏆 Finalis' },
  { to: '/admin/audit', label: '📋 Audit Log' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px', background: 'var(--navy-deep)', color: 'white',
        display: 'flex', flexDirection: 'column', padding: '1rem 0', flexShrink: 0
      }}>
        <div style={{ padding: '0 1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/admin" style={{ color: 'var(--gold)', fontWeight: 'bold', fontSize: '1.1rem', textDecoration: 'none' }}>
            ACASE Admin
          </Link>
        </div>
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.to} to={item.to} style={{
              display: 'block', padding: '0.6rem 1rem', color: 'white', textDecoration: 'none',
              background: isActive(item.to, item.exact) ? 'rgba(196,167,97,0.2)' : 'transparent',
              borderLeft: isActive(item.to, item.exact) ? '3px solid var(--gold)' : '3px solid transparent',
              fontSize: '0.9rem',
            }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/" style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
            ← Kembali ke Portal
          </Link>
          <button onClick={handleLogout} style={{
            background: 'transparent', border: '1px solid var(--muted)', color: 'var(--muted)',
            padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', width: '100%', fontSize: '0.85rem'
          }}>
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem', background: 'var(--cream)', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
