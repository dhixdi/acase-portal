import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { supabase } from '../lib/supabase';
import logoUrl from '../assets/logo.png';

export function Layout() {
  const { session } = useSession();
  const { data: isAdmin } = useIsAdmin(!!session);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        position: 'sticky', top: 0, zIndex: 100, 
        background: 'linear-gradient(180deg, rgba(22,30,48,.97), rgba(22,30,48,.92))',
        borderBottom: '1px solid var(--line)',
        backdropFilter: 'blur(6px)'
      }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '74px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <img src={logoUrl} alt="Logo" style={{ height: '42px', width: '42px', objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontFamily: "'Monotype Corsiva', 'Segoe Script', cursive", fontWeight: 400, color: 'var(--gold-bright)', fontSize: '1.15rem' }}>ACASE</span>
              <span style={{ fontFamily: 'var(--font-ui)', color: 'var(--cream)', fontSize: '0.72rem', letterSpacing: '0.06em', marginTop: '2px' }}>ASiQ UGM 2026</span>
            </div>
          </Link>
          
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontFamily: 'var(--font-ui)' }}>
            {session ? (
              <>
                {isAdmin ? (
                  <Link to="/admin" style={{ color: 'var(--gold-bright)', fontSize: '0.97rem', fontWeight: 500 }}>
                    ⚙️ Panel Admin
                  </Link>
                ) : (
                  <Link to="/" style={{ color: 'var(--cream)', fontSize: '0.97rem', transition: 'color 0.2s' }}>Dashboard</Link>
                )}
                <button onClick={handleLogout} style={{
                  fontFamily: 'var(--font-ui)', fontSize: '0.9rem',
                  color: 'var(--navy-deep)', background: 'var(--gold)',
                  padding: '0.55rem 1.15rem', border: '1px solid var(--gold)',
                  transition: 'background 0.2s, color 0.2s', cursor: 'pointer',
                  borderRadius: '2px'
                }}>
                  Keluar
                </button>
              </>
            ) : (
              <Link to="/login" style={{
                fontFamily: 'var(--font-ui)', fontSize: '0.9rem',
                color: 'var(--navy-deep)', background: 'var(--gold)',
                padding: '0.55rem 1.15rem', border: '1px solid var(--gold)',
                transition: 'background 0.2s, color 0.2s', borderRadius: '2px'
              }}>Masuk</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="wrap" style={{ flex: 1, padding: '3rem 1.25rem', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}
