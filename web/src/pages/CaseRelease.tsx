import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useMyStatus } from '../hooks/useMyStatus';
import { Link } from 'react-router-dom';

export default function CaseRelease() {
  const { data: status, isLoading: statusLoading } = useMyStatus();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const canAccessCase = status?.can_access_case;

  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ['caseMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('case_materials').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!canAccessCase
  });

  const handleDownload = async (path: string, id: string) => {
    setDownloadingId(id);
    try {
      const { data, error } = await supabase.storage
        .from('case-files')
        .createSignedUrl(path, 60);

      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      alert('Gagal mengunduh: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  if (statusLoading) return <div>Memuat status...</div>;
  if (!status) return <div>Gagal memuat status tim.</div>;

  const caseStage = status.stages['case_release'];
  
  if (!caseStage?.is_open) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 className="text-navy">🔒 Case Belum Dirilis</h1>
        <p>Case akan dirilis pada <strong>{new Date(caseStage?.opens_at || '').toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</strong></p>
      </div>
    );
  }

  if (!status.team?.biodata_completed) {
    return (
      <div className="card" style={{ borderLeft: '4px solid #ff9800' }}>
        <h2 style={{ marginTop: 0 }}>Biodata Belum Lengkap</h2>
        <p>Anda harus melengkapi biodata tim terlebih dahulu untuk membuka materi case.</p>
        <Link to="/biodata" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>Lengkapi Biodata</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-navy">Materi Case</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Materi bersifat rahasia dan hanya untuk peserta ACASE 2026.
      </p>

      {materialsLoading ? (
        <div>Memuat materi...</div>
      ) : materials?.length === 0 ? (
        <div className="card">Belum ada materi yang diunggah oleh panitia.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {materials?.map((m: any) => (
            <div key={m.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{m.title}</h3>
                {m.description && <p style={{ margin: '0 0 0.5rem 0', color: 'var(--muted)', fontSize: '0.9rem' }}>{m.description}</p>}
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  {m.file_name} • {Math.round(m.file_size / 1024)} KB
                </div>
              </div>
              <button 
                onClick={() => handleDownload(m.file_path, m.id)} 
                disabled={downloadingId === m.id}
                className="btn btn-primary"
              >
                {downloadingId === m.id ? 'Mengunduh...' : 'Unduh'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
