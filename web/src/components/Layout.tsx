import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { supabase } from '../lib/supabase';

export function Layout() {
  const { session } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="bg-navy" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
          <Link to="/" style={{ color: 'white' }}>ACASE 2026 Portal</Link>
        </div>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/pengumuman" style={{ color: 'white' }}>Pengumuman</Link>
          {session ? (
            <>
              <Link to="/" style={{ color: 'white' }}>Dashboard</Link>
              <Link to="/profil" style={{ color: 'white' }}>Profil</Link>
              <button onClick={handleLogout} className="btn btn-ghost" style={{ color: 'white', borderColor: 'white' }}>
                Keluar
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">Masuk</Link>
          )}
        </nav>
      </header>

      <main style={{ flex: 1, padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>

      <footer style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
        &copy; 2026 ASiQ HIMARIA FMIPA UGM
      </footer>
    </div>
  );
}
