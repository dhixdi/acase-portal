import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface SubmissionPanelProps {
  stageKey: 'case_submission' | 'pitch_deck';
  title: string;
  helpText: string;
  stageInfo: any;
  team: any;
}

export function SubmissionPanel({ stageKey, title, helpText, stageInfo, team }: SubmissionPanelProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

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
    if (submission && !confirm(`Ganti file "${submission.file_name}" dengan file baru?`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setIsUploading(true);

    try {
      const filePath = `${team.id}/${stageKey}/main.pdf`;

      // 1. Upload to storage
      const { error: storageError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file, { upsert: true, contentType: 'application/pdf' });

      if (storageError) throw new Error(storageError.message);

      // 2. Record to DB
      const { error: dbError } = await supabase.from('submissions').upsert({
        team_id: team.id,
        stage: stageKey,
        slot: 'main',
        file_path: filePath,
        file_name: file.name,
        file_size: file.size
      }, { onConflict: 'team_id,stage,slot' });

      if (dbError) throw new Error(dbError.message);

      setUploadSuccess('Berkas berhasil dikirim! Simpan bukti pengiriman di bawah ini.');
      queryClient.invalidateQueries({ queryKey: ['submissions', stageKey] });
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
        .createSignedUrl(submission.file_path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      alert('Gagal mengunduh: ' + err.message);
    }
  };

  if (isLoading) return <div>Memuat data submission...</div>;

  const isPastDeadline = stageInfo?.closes_at
    ? new Date(stageInfo.closes_at).getTime() < Date.now()
    : false;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{title}</h2>

      <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <strong>Batas Waktu:</strong>{' '}
        {stageInfo?.closes_at
          ? new Date(stageInfo.closes_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
          : 'Belum ditentukan'}
        <p style={{ margin: '0.5rem 0 0 0' }}>{helpText}</p>
      </div>

      {uploadError && (
        <div style={{ color: 'red', background: '#ffebee', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {uploadError}
        </div>
      )}
      {uploadSuccess && (
        <div style={{ color: 'green', background: '#e8f5e9', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {uploadSuccess}
        </div>
      )}

      {/* Dropzone — tampil selama belum lewat deadline */}
      {!isPastDeadline ? (
        <div
          style={{
            border: '2px dashed var(--gold)',
            padding: '2.5rem',
            textAlign: 'center',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            background: '#fdfaf4',
            position: 'relative',
            cursor: isUploading ? 'not-allowed' : 'pointer',
          }}
        >
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isUploading}
            style={{
              opacity: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              cursor: isUploading ? 'not-allowed' : 'pointer',
            }}
          />
          <div style={{ pointerEvents: 'none' }}>
            {isUploading ? (
              <strong>⏳ Mengunggah... Mohon tunggu.</strong>
            ) : (
              <>
                <div style={{ fontSize: '2rem' }}>📄</div>
                <strong style={{ color: 'var(--navy)' }}>Klik atau seret file PDF ke sini</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                  Hanya PDF · Maksimal 10 MB
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '1.5rem', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '1rem' }}>
          Tenggat pengumpulan telah berakhir.
        </div>
      )}

      {/* Bukti pengiriman */}
      {submission ? (
        <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>📎 Bukti Pengiriman</h4>
            <div style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.8' }}>
              <strong>File:</strong> {submission.file_name}<br />
              <strong>Ukuran:</strong> {Math.round(submission.file_size / 1024)} KB<br />
              <strong>Waktu Unggah:</strong> {new Date(submission.updated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
            </div>
            <span style={{
              display: 'inline-block', marginTop: '0.5rem', padding: '0.2rem 0.6rem',
              background: isPastDeadline ? '#e0e0e0' : '#e8f5e9',
              color: isPastDeadline ? '#555' : 'green',
              fontSize: '0.8rem', borderRadius: '4px'
            }}>
              {isPastDeadline ? '🔒 Terkunci' : '✅ Terkirim'}
            </span>
          </div>
          <button onClick={handleDownload} className="btn btn-ghost">Unduh Berkas Saya</button>
        </div>
      ) : (
        !isPastDeadline && (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Belum ada berkas yang diunggah.</p>
        )
      )}

      {!submission && isPastDeadline && (
        <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Tidak ada berkas yang tercatat.</p>
      )}
    </div>
  );
}
