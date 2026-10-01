import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logoUrl from '../assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const sanitizedInput = email.trim().toLowerCase();
    const loginEmail = sanitizedInput.includes('@') ? sanitizedInput : `${sanitizedInput}@asiq.ugm.ac.id`;

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password.trim(),
    });

    if (error) {
      setError('Username atau password salah.');
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      background: 'linear-gradient(180deg, var(--navy-deep), var(--navy) 70%, var(--navy-soft))',
      overflow: 'hidden'
    }}>
      <div className="stars-bg"></div>
      
      <div className="card" style={{ 
        maxWidth: '400px', 
        width: '90%', 
        position: 'relative', 
        zIndex: 1,
        background: 'var(--cream)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <img src={logoUrl} alt="ACASE Logo" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontFamily: "'Monotype Corsiva', 'Segoe Script', cursive", fontWeight: 400, color: 'var(--gold-deep)', fontSize: '2.2rem', marginBottom: '0.2rem' }}>
          ACASE
        </h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', letterSpacing: '0.08em', color: 'var(--navy-deep)', marginTop: 0, marginBottom: '1.75rem', fontWeight: 500 }}>ASiQ UGM 2026</p>
        
        {error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem', fontFamily: 'var(--font-ui)' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Username (misal: ACASE-011)"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%' }}
          />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', fontFamily: 'var(--font-ui)' }}>
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', color: 'var(--cream)', opacity: 0.75 }}>Butuh bantuan? Hubungi panitia:</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <a href="mailto:asiqugm@gmail.com" style={{ color: 'var(--gold-bright)', fontSize: '0.88rem', textDecoration: 'none', fontWeight: 600 }}>
              ✉ asiqugm@gmail.com
            </a>
            <a href="https://wa.me/6285358139234" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-bright)', fontSize: '0.88rem', textDecoration: 'none', fontWeight: 600 }}>
              💬 +62 853-5813-9234 (Arif)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
