import { useMyStatus } from '../hooks/useMyStatus';
import { SubmissionPanel } from '../components/SubmissionPanel';

export default function CaseSubmission() {
  const { data: status, isLoading } = useMyStatus();

  if (isLoading) return <div>Memuat status...</div>;
  if (!status || !status.team) return <div>Gagal memuat status tim.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="text-navy">Pengumpulan Case</h1>
      
      <SubmissionPanel 
        stageKey="case_submission"
        title="File Jawaban Case"
        helpText="Unggah jawaban case berupa file PDF dengan ukuran maksimal 10 MB. Anda bisa mengunggah ulang untuk merevisi jawaban selama periode pengumpulan masih dibuka."
        canSubmit={status.can_submit_case}
        stageInfo={status.stages['case_submission']}
        team={status.team}
      />
    </div>
  );
}
