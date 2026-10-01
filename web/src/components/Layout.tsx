import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { supabase } from '../lib/supabase';
import logoUrl from '../assets/logo.png';

export function Layout() {
  const { session } = useSession();
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
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', fontSize: '1.15rem', letterSpacing: '.02em' }}>Portal Peserta</span>
              <span style={{ fontFamily: 'var(--font-script)', color: 'var(--gold-bright)', fontSize: '1.05rem', marginTop: '-2px' }}>ACASE 2026</span>
            </div>
          </Link>
          
          <nav style={{ display: 'flex', gap: '1.9rem', alignItems: 'center', fontFamily: 'var(--font-ui)' }}>
            {session ? (
              <>
                <Link to="/" style={{ color: 'var(--cream)', fontSize: '0.97rem', transition: 'color 0.2s' }}>Dashboard</Link>
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

      <footer style={{ background: 'var(--navy-deep)', color: '#c6ccd6', borderTop: '1px solid var(--line)' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', padding: '2.4rem 0', flexWrap: 'wrap', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.2rem', fontFamily: 'var(--font-script)', color: 'var(--gold)', lineHeight: 1 }}>ASiQ 2026</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', fontWeight: 300, color: '#a9b1bd', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Presented by</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.3rem' }}>
              <img src={logoUrl} alt="Logo ASiQ" style={{ height: '50px', objectFit: 'contain' }} />
            </div>
          </div>
          
          <div style={{ fontFamily: 'var(--font-ui)' }}>
            <h4 style={{ color: 'var(--cream)', fontSize: '0.9rem', fontWeight: 500, marginBottom: '1rem' }}>Kontak Kami</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.92rem' }}>
              <li style={{ marginBottom: '0.6rem' }}><a href="mailto:asiqugm@gmail.com">asiqugm@gmail.com</a></li>
              <li>+62 813-8226-5484 (Khisa)</li>
            </ul>
          </div>
        </div>
        
        <div className="wrap" style={{ borderTop: '1px solid var(--line-soft)', padding: '1.4rem 0', fontFamily: 'var(--font-ui)', fontSize: '0.82rem', color: '#8a93a0' }}>
          &copy; 2026 ASiQ. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
