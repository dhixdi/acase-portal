import { useMyStatus } from '../hooks/useMyStatus';
import { SubmissionPanel } from '../components/SubmissionPanel';

export default function PitchDeck() {
  const { data: status, isLoading } = useMyStatus();

  if (isLoading) return <div>Memuat status...</div>;
  if (!status || !status.team) return <div>Gagal memuat status tim.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="text-navy">Pengumpulan Pitch Deck</h1>
      
      {!status.is_finalist ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <h2 style={{ color: 'var(--navy)', marginTop: 0 }}>Tahap Terkunci</h2>
          <p style={{ color: 'var(--muted)' }}>Pengumpulan Pitch Deck hanya dapat diakses oleh tim yang lolos ke tahap Final.</p>
        </div>
      ) : (
        <SubmissionPanel 
          stageKey="pitch_deck"
          title="File Pitch Deck"
          helpText="Unggah Pitch Deck Anda berupa file PDF dengan ukuran maksimal 10 MB. Anda bisa mengunggah ulang untuk merevisi selama periode pengumpulan masih dibuka."
          stageInfo={status.stages['pitch_deck']}
          team={status.team}
        />
      )}
    </div>
  );
}
