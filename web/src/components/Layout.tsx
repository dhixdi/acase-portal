import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { supabase } from '../lib/supabase';
import logoUrl from '../assets/logo.png';

export function Layout() {
  const { session } = useSession();
  const { data: isAdmin } = useIsAdmin(!!session);
  const navigate = useNavigate();
  const [hasNewNotif, setHasNewNotif] = useState(false);

  useEffect(() => {
    if (session && isAdmin === false) {
      const checkNotif = async () => {
        const { data } = await supabase
          .from('announcements')
          .select('published_at')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const latestDate = new Date(data[0].published_at).getTime();
          const lastRead = localStorage.getItem('last_read_notif');
          // Jika belum pernah baca, atau ada pengumuman yang lebih baru dari terakhir kali baca
          if (!lastRead || latestDate > parseInt(lastRead)) {
            setHasNewNotif(true);
          }
        }
      };
      checkNotif();
    }
  }, [session, isAdmin]);

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
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
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
                    ⚡ Panel Admin
                  </Link>
                ) : (
                  <>
                    <Link to="/" style={{ color: 'var(--cream)', fontSize: '0.97rem', transition: 'color 0.2s', textDecoration: 'none' }}>Dashboard</Link>
                    <Link to="/profile" style={{ color: 'var(--cream)', fontSize: '0.97rem', transition: 'color 0.2s', textDecoration: 'none' }}>Profil Tim</Link>
                  </>
                )}
                
                <button onClick={handleLogout} style={{
                  fontFamily: 'var(--font-ui)', fontSize: '0.9rem',
                  color: 'var(--navy-deep)', background: 'var(--gold)',
                  padding: '0.55rem 1.15rem', border: '1px solid var(--gold)',
                  transition: 'background 0.2s, color 0.2s', cursor: 'pointer',
                  borderRadius: '6px'
                }}>
                  Keluar
                </button>

                {!isAdmin && (
                  <Link 
                    to="/pengumuman" 
                    title="Pengumuman"
                    onClick={() => {
                      localStorage.setItem('last_read_notif', Date.now().toString());
                      setHasNewNotif(false);
                    }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '38px',
                      height: '38px',
                      background: '#f97316', // Orange background like image
                      color: '#111827', // Dark icon color
                      borderRadius: '8px',
                      textDecoration: 'none',
                      borderBottom: '3px solid #ea580c', // 3D effect like image
                      marginLeft: '0.5rem',
                      transition: 'transform 0.1s',
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(2px)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    
                    {hasNewNotif && (
                      <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        width: '12px',
                        height: '12px',
                        background: '#e11d48', // Red dot
                        borderRadius: '50%',
                        border: '2px solid var(--navy-deep)', // Match navbar background to cut out
                      }}></span>
                    )}
                  </Link>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <a href="https://bit.ly/NationalActuarialCaseCompetitionASiQ2026Registration" target="_blank" rel="noopener noreferrer" style={{
                  fontFamily: 'var(--font-ui)', fontSize: '0.9rem',
                  color: 'var(--cream)', background: 'transparent',
                  padding: '0.55rem 1.15rem', border: '1px solid var(--gold)',
                  transition: 'background 0.2s, color 0.2s', borderRadius: '6px',
                  textDecoration: 'none'
                }}>Daftar</a>
                <Link to="/login" style={{
                fontFamily: 'var(--font-ui)', fontSize: '0.9rem',
                color: 'var(--navy-deep)', background: 'var(--gold)',
                padding: '0.55rem 1.15rem', border: '1px solid var(--gold)',
                transition: 'background 0.2s, color 0.2s', borderRadius: '6px'
              , textDecoration: 'none'}}>Masuk</Link>
            )}
              </div>
          </nav>
        </div>
      </header>

      <main className="wrap" style={{ flex: 1, padding: '3rem 1.25rem', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}

