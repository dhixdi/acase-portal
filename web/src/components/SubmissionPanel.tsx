import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface SubmissionPanelProps {
  stageKey: 'case_submission' | 'pitch_deck';
  title: string;
  helpText: string;
  canSubmit: boolean;
  stageInfo: any;
  team: any;
}

export function SubmissionPanel({ stageKey, title, helpText, canSubmit, stageInfo, team }: SubmissionPanelProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: submission, isLoading } = useQuery({
    queryKey: ['submissions', stageKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('stage', stageKey)
        .eq('slot', 'main')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!team?.biodata_completed
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Hanya file PDF yang diperbolehkan.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 10 MB.');
      return;
    }

    if (submission && !confirm(`Anda yakin ingin menimpa file "${submission.file_name}" dengan file baru ini?`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      const filePath = `${team.id}/${stageKey}/main.pdf`;

      // 1. Upload to Storage
      const { error: storageError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file, {
          upsert: true,
          contentType: 'application/pdf'
        });

      if (storageError) throw new Error(storageError.message);

      // 2. Record to Database
      const { error: dbError } = await supabase
        .from('submissions')
        .upsert({
          team_id: team.id,
          stage: stageKey,
          slot: 'main',
          file_path: filePath,
          file_name: file.name,
          file_size: file.size
        }, { onConflict: 'team_id,stage,slot' });

      if (dbError) throw new Error(dbError.message);

      queryClient.invalidateQueries({ queryKey: ['submissions', stageKey] });
      alert('Berkas berhasil dikirim!');
    } catch (err: any) {
      setUploadError(`Gagal mengunggah: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async () => {
    if (!submission) return;
    try {
      const { data, error } = await supabase.storage
        .from('submissions')
        .createSignedUrl(submission.file_path, 60, {
          download: submission.file_name
        });
      
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      alert('Gagal mengunduh file: ' + err.message);
    }
  };

  if (isLoading) return <div>Memuat data submission...</div>;

  const isOpen = stageInfo?.is_open;
  const isPastDeadline = stageInfo?.closes_at && new Date(stageInfo.closes_at).getTime() < new Date().getTime();

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      
      <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <strong>Batas Waktu:</strong> {stageInfo?.closes_at ? new Date(stageInfo.closes_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB' : 'Belum ditentukan'}
        <p style={{ margin: '0.5rem 0 0 0' }}>{helpText}</p>
      </div>

      {uploadError && <div style={{ color: 'red', marginBottom: '1rem' }}>{uploadError}</div>}

      {!isOpen && !isPastDeadline && (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#eee', borderRadius: '4px' }}>
          🔒 Tahap belum dibuka.
        </div>
      )}

      {isPastDeadline && (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
          Tenggat telah berakhir.
        </div>
      )}

      {canSubmit && (
        <div style={{ border: '2px dashed #ccc', padding: '2rem', textAlign: 'center', borderRadius: '4px', marginBottom: '1.5rem', position: 'relative' }}>
          <input 
            type="file" 
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isUploading}
            style={{
              opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: isUploading ? 'not-allowed' : 'pointer'
            }}
          />
          <div style={{ pointerEvents: 'none' }}>
            {isUploading ? (
              <span style={{ fontWeight: 'bold' }}>Mengunggah... Mohon tunggu.</span>
            ) : (
              <span>
                <strong style={{ color: 'var(--gold)' }}>Klik atau seret file PDF ke sini</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Maksimal 10 MB. Mengunggah file baru akan menimpa file lama.</div>
              </span>
            )}
          </div>
        </div>
      )}

      {submission && (
        <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Bukti Pengiriman</h4>
            <div style={{ fontSize: '0.9rem', color: '#555' }}>
              <strong>File:</strong> {submission.file_name} <br/>
              <strong>Ukuran:</strong> {Math.round(submission.file_size / 1024)} KB <br/>
              <strong>Waktu Unggah:</strong> {new Date(submission.updated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', background: isPastDeadline ? '#e0e0e0' : '#e8f5e9', color: isPastDeadline ? '#555' : 'green', fontSize: '0.8rem', borderRadius: '4px' }}>
                {isPastDeadline ? '🔒 Terkunci (Tenggat Berakhir)' : '✓ Terkirim'}
              </span>
            </div>
          </div>
          <button onClick={handleDownload} className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
            Unduh Berkas Saya
          </button>
        </div>
      )}

      {!submission && isPastDeadline && (
        <div style={{ color: 'var(--muted)', textAlign: 'center' }}>
          Tidak ada berkas yang tercatat.
        </div>
      )}
    </div>
  );
}
