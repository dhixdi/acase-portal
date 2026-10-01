import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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
    if (submission) {
      // Save file ref and show toast confirmation
      const pendingFile = file;
      toast((t) => (
        <div style={{ fontFamily: 'var(--font-ui)' }}>
          <strong>Ganti file?</strong>
          <p style={{ margin: '0.5rem 0', fontSize: '0.85rem' }}>File "<strong>{submission.file_name}</strong>" akan diganti dengan file baru.</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => { toast.dismiss(t.id); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ padding: '0.3rem 0.8rem', border: '1px solid #ccc', background: 'white', cursor: 'pointer', borderRadius: '4px', fontSize: '0.8rem' }}>Batal</button>
            <button onClick={() => { toast.dismiss(t.id); doUpload(pendingFile); }} style={{ padding: '0.3rem 0.8rem', border: 'none', background: 'var(--gold)', color: 'var(--navy-deep)', cursor: 'pointer', borderRadius: '4px', fontSize: '0.8rem' }}>Ganti File</button>
          </div>
        </div>
      ), { duration: Infinity });
      return;
    }

    doUpload(file);
  };

  const doUpload = async (file: File) => {
    setUploadError('');
    setUploadSuccess('');
    setIsUploading(true);

    try {
      const filePath = `${team.id}/${stageKey}/main.pdf`;

      const { error: storageError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file, { upsert: true, contentType: 'application/pdf' });

      if (storageError) throw new Error(storageError.message);

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
      toast.success('Berkas berhasil diunggah!');
      queryClient.invalidateQueries({ queryKey: ['submissions', stageKey] });
    } catch (err: any) {
      setUploadError(`Gagal mengunggah: ${err.message}`);
      toast.error('Gagal mengunggah: ' + err.message);
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
      toast.error('Gagal mengunduh: ' + err.message);
    }
  };

  if (isLoading) return <div>Memuat data submission...</div>;

  const isPastDeadline = stageInfo?.closes_at
    ? new Date(stageInfo.closes_at).getTime() < Date.now()
    : false;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, color: 'var(--navy-deep)', fontWeight: 700 }}>{title}</h2>

      <div style={{ background: 'rgba(22, 30, 48, 0.05)', padding: '1.25rem', borderRadius: '4px', marginBottom: '1.5rem', fontFamily: 'var(--font-ui)', fontSize: '0.95rem', color: 'var(--navy-deep)' }}>
        <strong style={{ fontWeight: 600 }}>Batas Waktu:</strong>{' '}
        {stageInfo?.closes_at
          ? new Date(stageInfo.closes_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
          : 'Belum ditentukan'}
        <p style={{ margin: '0.5rem 0 0 0', lineHeight: 1.5, color: 'var(--navy-soft)' }}>{helpText}</p>
      </div>

      {uploadError && (
        <div style={{ color: '#c62828', background: '#ffebee', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontFamily: 'var(--font-ui)', fontSize: '0.9rem' }}>
          {uploadError}
        </div>
      )}
      {uploadSuccess && (
        <div style={{ color: '#2e7d32', background: '#e8f5e9', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontFamily: 'var(--font-ui)', fontSize: '0.9rem' }}>
          {uploadSuccess}
        </div>
      )}

      {/* Dropzone */}
      {!isPastDeadline ? (
        <div
          style={{
            border: '2px dashed var(--gold)',
            padding: '2.5rem',
            textAlign: 'center',
            borderRadius: '8px',
            marginBottom: '2rem',
            background: 'var(--cream)',
            position: 'relative',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s, border-color 0.2s'
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
          <div style={{ pointerEvents: 'none', fontFamily: 'var(--font-ui)' }}>
            {isUploading ? (
              <strong style={{ color: 'var(--navy-deep)' }}>Mengunggah... Mohon tunggu.</strong>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
                <strong style={{ color: 'var(--navy-deep)', fontSize: '1.1rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Klik atau seret file PDF ke sini</strong>
                <div style={{ fontSize: '0.85rem', color: 'var(--navy-soft)' }}>
                  Hanya file PDF — Maksimal 10 MB
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '1.5rem', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '1.5rem', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          Tenggat pengumpulan telah berakhir.
        </div>
      )}

      {/* Bukti pengiriman */}
      {submission ? (
        <div style={{ border: '1px solid var(--line)', padding: '1.25rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', background: 'rgba(196,167,97,0.05)' }}>
          <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--navy-deep)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
              <span>✅</span> Bukti Pengiriman
            </h4>
            <div style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
              <div><strong style={{ fontWeight: 600 }}>File:</strong> {submission.file_name}</div>
              <div><strong style={{ fontWeight: 600 }}>Ukuran:</strong> {Math.round(submission.file_size / 1024)} KB</div>
              <div><strong style={{ fontWeight: 600 }}>Waktu Unggah:</strong> {new Date(submission.updated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem',
                background: isPastDeadline ? 'rgba(22, 30, 48, 0.1)' : '#e8f5e9',
                color: isPastDeadline ? 'var(--navy-deep)' : '#2e7d32',
                fontSize: '0.8rem', borderRadius: '4px', fontWeight: 600
              }}>
                {isPastDeadline ? '🔒 Terkunci' : '✓ Terkirim'}
              </span>
            </div>
          </div>
          <button onClick={handleDownload} className="btn btn-primary">UNDUH BERKAS SAYA</button>
        </div>
      ) : (
        !isPastDeadline && (
          <p style={{ color: 'var(--navy-soft)', fontSize: '0.95rem', fontFamily: 'var(--font-ui)' }}>Belum ada berkas yang diunggah.</p>
        )
      )}

      {!submission && isPastDeadline && (
        <p style={{ color: 'var(--navy-soft)', textAlign: 'center', fontFamily: 'var(--font-ui)' }}>Tidak ada berkas yang tercatat.</p>
      )}
    </div>
  );
}
