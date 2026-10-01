import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

interface SubmissionsAdminProps {
  stage: 'case_submission' | 'pitch_deck';
  title: string;
}

export function SubmissionsAdmin({ stage, title }: SubmissionsAdminProps) {
  const [filter, setFilter] = useState<'all' | 'submitted' | 'missing'>('all');
  const [zipNameMode, setZipNameMode] = useState<'name' | 'code'>('name');

  const { data: teams, isLoading } = useQuery({
    queryKey: ['adminTeams', stage],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_team_overview').select('*').order('code');
      if (error) throw error;
      // Filter for pitch_deck: only finalists
      if (stage === 'pitch_deck') return data.filter(t => t.is_finalist);
      return data;
    }
  });

  const { data: submissions } = useQuery({
    queryKey: ['adminSubmissions', stage],
    queryFn: async () => {
      const { data, error } = await supabase.from('submissions').select('*').eq('stage', stage);
      if (error) throw error;
      return data;
    }
  });

  const handleDownloadOne = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('submissions').createSignedUrl(filePath, 60);
    if (error) { alert('Gagal: ' + error.message); return; }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ done: 0, total: 0 });
  const [includeManifest, setIncludeManifest] = useState(false);

  const handleDownloadZip = async () => {
    const submittedTeams = teams?.filter(t => {
      if (stage === 'case_submission') return t.case_submitted_at;
      if (stage === 'pitch_deck') return t.pitch_submitted_at;
      return false;
    }) ?? [];
    
    if (submittedTeams.length === 0) { alert('Belum ada tim yang submit.'); return; }

    setIsZipping(true);
    setZipProgress({ done: 0, total: submittedTeams.length });

    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      let errors: string[] = [];
      let done = 0;
      let manifestRows = ['Kode,Nama Kelompok,Waktu Submit WIB,Ukuran (byte),Nama File Asli'];

      // Helper for concurrency
      const concurrency = 4;
      const queue = [...submittedTeams];
      
      const worker = async () => {
        while (queue.length > 0) {
          const team = queue.shift()!;
          const sub = submissions?.find(s => s.team_id === team.id && s.slot === 'main');
          if (!sub) continue;

          try {
            const { data, error } = await supabase.storage.from('submissions').download(sub.file_path);
            if (error) throw error;

            // Name generation
            let safeName = '';
            if (zipNameMode === 'name') {
              // Sanitize: replace illegal chars, trim spaces/dots, truncate to 100
              safeName = (team.name || team.code).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '').slice(0, 100) || team.code;
            } else {
              safeName = team.code;
            }
            
            // Handle duplicates (case-insensitive check for windows)
            let fileName = `${safeName}.pdf`;
            const existingFiles = Object.keys(zip.files).map(f => f.toLowerCase());
            if (existingFiles.includes(fileName.toLowerCase())) {
               fileName = `${safeName} (${team.code}).pdf`;
            }
            
            zip.file(fileName, data, { compression: 'STORE' });
            
            // Manifest
            if (includeManifest) {
              const submitTime = new Date(sub.updated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
              manifestRows.push(`"${team.code}","${(team.name || '').replace(/"/g, '""')}","${submitTime}","${sub.file_size}","${sub.file_name.replace(/"/g, '""')}"`);
            }
            
          } catch (err: any) {
            errors.push(`${team.code}: ${err.message}`);
          }
          
          done++;
          setZipProgress({ done, total: submittedTeams.length });
        }
      };

      await Promise.all(Array.from({ length: concurrency }).map(() => worker()));

      if (errors.length > 0) {
        zip.file('_ERRORS.txt', errors.join('\n'));
      }
      
      if (includeManifest && manifestRows.length > 1) {
        zip.file('_manifest.csv', '\uFEFF' + manifestRows.join('\n'));
      }

      const blob = await zip.generateAsync({ type: 'blob', streamFiles: true });
      
      // Audit log
      await supabase.from('audit_log').insert({
        actor: (await supabase.auth.getUser()).data.user?.id,
        action: 'zip_downloaded',
        entity: 'stage',
        entity_id: stage,
        details: { files: done, mode: zipNameMode, manifest: includeManifest }
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acase-${stage}-${new Date().toISOString().slice(0,10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      if (errors.length > 0) {
        alert(`ZIP selesai dibuat. ${done} file diproses, namun ada ${errors.length} gagal (cek _ERRORS.txt).`);
      }
    } finally {
      setIsZipping(false);
    }
  };

  if (isLoading) return <div>Memuat data submission...</div>;

  const filtered = teams?.filter(t => {
    const isSubmitted = stage === 'case_submission' ? !!t.case_submitted_at : !!t.pitch_submitted_at;
    if (filter === 'submitted') return isSubmitted;
    if (filter === 'missing') return !isSubmitted;
    return true;
  }) ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="text-navy">{title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.85rem' }}>
            <input type="checkbox" checked={includeManifest} onChange={e => setIncludeManifest(e.target.checked)} disabled={isZipping} />
            Sertakan CSV Manifest
          </label>
          <select value={zipNameMode} onChange={e => setZipNameMode(e.target.value as any)} disabled={isZipping} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value="name">Beri nama tim (Nama Kelompok.pdf)</option>
            <option value="code">Beri nama kode (ACASE-001.pdf)</option>
          </select>
          <button onClick={handleDownloadZip} disabled={isZipping} className="btn btn-primary">
            {isZipping ? `Sedang ZIP... (${zipProgress.done}/${zipProgress.total})` : '📦 Unduh Semua (ZIP)'}
          </button>
        </div>
      </div>
      
      {isZipping && (
        <div style={{ background: '#eee', height: '6px', width: '100%', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
          <div style={{ background: 'var(--gold)', height: '100%', width: `${(zipProgress.done / zipProgress.total) * 100}%`, transition: 'width 0.2s' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1.5rem 0 1rem' }}>
        {(['all', 'submitted', 'missing'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '0.8rem' }}>
            {f === 'all' ? 'Semua' : f === 'submitted' ? 'Sudah Submit' : 'Belum Submit'}
          </button>
        ))}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: 'var(--navy)', color: 'white' }}>
          <th style={th}>Kode</th><th style={th}>Nama</th><th style={th}>Status</th>
          <th style={th}>Waktu Submit</th><th style={th}>Ukuran</th><th style={th}>Aksi</th>
        </tr></thead>
        <tbody>
          {filtered.map(t => {
            const sub = submissions?.find(s => s.team_id === t.id && s.slot === 'main');
            const submittedAt = stage === 'case_submission' ? t.case_submitted_at : t.pitch_submitted_at;
            
            return (
              <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}><strong>{t.code}</strong></td>
                <td style={td}>{t.name || '-'}</td>
                <td style={td}>{submittedAt
                  ? <span style={{ color: 'green' }}>✅ Sudah</span>
                  : <span style={{ color: 'red' }}>❌ Belum</span>}
                </td>
                <td style={td}>{submittedAt ? new Date(submittedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}</td>
                <td style={td}>{sub ? `${Math.round(sub.file_size / 1024)} KB` : '-'}</td>
                <td style={td}>
                  {sub && <button onClick={() => handleDownloadOne(sub.file_path)} className="btn btn-ghost" style={{ fontSize: '0.75rem' }}>Unduh</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: '0.5rem', textAlign: 'left', fontSize: '0.8rem' };
const td: React.CSSProperties = { padding: '0.5rem' };
