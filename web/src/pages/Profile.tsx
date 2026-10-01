import { useMyStatus } from '../hooks/useMyStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { data: status, isLoading: statusLoading } = useMyStatus();

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['myTeamMembers'],
    queryFn: async () => {
      if (!status?.team?.id) return [];
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', status.team.id)
        .order('member_no');
      if (error) throw error;
      return data;
    },
    enabled: !!status?.team?.id,
  });

  if (statusLoading || membersLoading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--navy-deep)' }}>Memuat profil...</div>;
  }

  const team = status?.team;

  if (!team || !team.biodata_completed) {
    return (
      <div className="card" style={{ borderLeft: '4px solid #ff9800', maxWidth: '600px', margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0 }}>Profil Belum Tersedia</h2>
        <p>Anda belum menyelesaikan pengisian biodata. Silakan isi biodata terlebih dahulu.</p>
        <Link to="/biodata" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>Lengkapi Biodata</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <h1 className="text-navy" style={{ margin: 0 }}>Profil Tim</h1>
        <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>
          🔒 Biodata Terkunci
        </span>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '0.75rem', marginBottom: '1.5rem', color: 'var(--navy-deep)' }}>Identitas Kelompok</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontFamily: 'var(--font-ui)' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--navy-soft)', marginBottom: '0.2rem' }}>Nama Kelompok</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--navy-deep)' }}>{team.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--navy-soft)', marginBottom: '0.2rem' }}>Kode Peserta</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--navy-deep)' }}>{team.code}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--navy-soft)', marginBottom: '0.2rem' }}>Jumlah Anggota</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--navy-deep)' }}>{team.team_size} Orang</div>
          </div>
        </div>
      </div>

      <h3 className="text-navy" style={{ marginBottom: '1rem' }}>Anggota Tim</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {members?.map((m: any) => (
          <div key={m.id} className="card" style={{ position: 'relative' }}>
            {m.is_leader && (
              <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--gold)', color: 'var(--navy-deep)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-ui)', textTransform: 'uppercase' }}>
                Ketua Tim
              </span>
            )}
            <h4 style={{ margin: '0 0 1.25rem 0', color: 'var(--navy-deep)' }}>Anggota {m.member_no}</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', fontFamily: 'var(--font-ui)' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--navy-soft)', marginBottom: '0.1rem' }}>Nama Lengkap</div>
                <div style={{ fontWeight: 500, color: 'var(--navy-deep)' }}>{m.full_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--navy-soft)', marginBottom: '0.1rem' }}>NIM</div>
                <div style={{ fontWeight: 500, color: 'var(--navy-deep)' }}>{m.nim}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--navy-soft)', marginBottom: '0.1rem' }}>Universitas</div>
                <div style={{ fontWeight: 500, color: 'var(--navy-deep)' }}>{m.institution}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--navy-soft)', marginBottom: '0.1rem' }}>Fakultas / Jurusan</div>
                <div style={{ fontWeight: 500, color: 'var(--navy-deep)' }}>{m.major}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--navy-soft)', marginBottom: '0.1rem' }}>Jenjang & Angkatan</div>
                <div style={{ fontWeight: 500, color: 'var(--navy-deep)' }}>{m.degree_level} - {m.batch}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--navy-soft)', marginBottom: '0.1rem' }}>Kontak</div>
                <div style={{ fontWeight: 500, color: 'var(--navy-deep)' }}>{m.whatsapp}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--navy-soft)' }}>{m.email}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
