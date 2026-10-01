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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Email atau password salah.');
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
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', marginBottom: '1.5rem' }}>
          Portal Peserta<br/>
          <span style={{ fontFamily: 'var(--font-script)', color: 'var(--gold-deep)', fontSize: '1.4rem' }}>ACASE 2026</span>
        </h1>
        
        {error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem', fontFamily: 'var(--font-ui)' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            placeholder="Email Tim"
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
      </div>
    </div>
  );
}
