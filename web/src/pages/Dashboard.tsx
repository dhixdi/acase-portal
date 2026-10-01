import { useSession } from '../hooks/useSession';
import { useMyStatus } from '../hooks/useMyStatus';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { session } = useSession();
  const { data: status, isLoading, error } = useMyStatus(!!session);
  const navigate = useNavigate();

  if (isLoading) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--navy-deep)' }}>Memuat data tim...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>Gagal memuat status.</div>;
  if (!status?.has_team) return <div style={{ textAlign: 'center', padding: '2rem' }}>Akun Anda belum terkait dengan tim mana pun.</div>;

  const team = status.team!;

  if (!team.is_active) {
    return (
      <div className="card" style={{ borderLeft: '4px solid red', maxWidth: '600px', margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0 }}>Akun Nonaktif</h2>
        <p>Akun tim Anda dinonaktifkan. Silakan hubungi panitia untuk informasi lebih lanjut.</p>
      </div>
    );
  }

  // Icons
  const IconUser = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  const IconDownload = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
  const IconUpload = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
  const IconLock = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
  const IconCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
  const IconArrow = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

  const ActionCard = ({ title, desc, icon, locked, done, to, step }: any) => {
    return (
      <div 
        onClick={() => !locked && navigate(to)}
        className={`dash-action-card ${locked ? 'locked' : ''} ${done ? 'done' : ''}`}
      >
        <div className="card-header">
          <span className="step-badge">Langkah {step}</span>
          <div className="icon-wrapper">
            {locked ? <IconLock /> : (done ? <IconCheck /> : icon)}
          </div>
        </div>
        <h3>{title}</h3>
        <p>{desc}</p>
        <div className="card-footer">
          <span className="status-text">{locked ? 'Terkunci' : (done ? 'Selesai' : 'Buka Sekarang')}</span>
          {!locked && <div className="arrow-icon"><IconArrow /></div>}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper">
      <style>{`
        .dashboard-wrapper {
          animation: fadeIn 0.6s ease-out forwards;
        }

        .dash-hero {
          background: linear-gradient(135deg, var(--navy-deep), var(--navy-soft));
          border-radius: 12px;
          padding: 3rem 2.5rem;
          color: var(--cream);
          margin-bottom: 2.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(22, 30, 48, 0.15);
        }
        .dash-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(1px 1px at 10% 20%, #fff, transparent), radial-gradient(1px 1px at 80% 15%, #fff, transparent), radial-gradient(1px 1px at 45% 60%, #fff, transparent);
          opacity: 0.3;
        }
        .dash-hero-content {
          position: relative;
          z-index: 1;
        }
        .dash-hero h1 {
          color: var(--cream);
          font-size: 2.2rem;
          font-weight: 700;
          margin-bottom: 0;
        }
        .team-code {
          font-family: var(--font-ui);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--gold);
          letter-spacing: 0.08em;
        }

        .dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .dash-action-card {
          background: var(--cream-card);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 2rem 1.8rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .dash-action-card:hover:not(.locked) {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(196, 167, 97, 0.15);
          border-color: var(--gold);
        }
        .dash-action-card:hover:not(.locked) .arrow-icon {
          transform: translateX(4px);
        }
        .dash-action-card.locked {
            opacity: 0.85;
          cursor: not-allowed;
          background: #e9e2d5;
          border-color: #d1c8b4;
        }
        .dash-action-card.done {
          border-color: var(--gold-deep);
          background: rgba(196, 167, 97, 0.05);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        .step-badge {
          font-family: var(--font-ui);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold-deep);
        }
        .icon-wrapper {
          color: var(--navy-deep);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: rgba(22, 30, 48, 0.05);
          border-radius: 50%;
        }
        .dash-action-card.done .icon-wrapper {
          color: #2e7d32;
          background: #e8f5e9;
        }
        .dash-action-card.locked .icon-wrapper {
          color: var(--navy-soft);
        }
        
        .dash-action-card h3 {
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--navy-deep);
        }
        .dash-action-card p {
            color: var(--navy-deep);
          font-size: 0.95rem;
          line-height: 1.5;
          flex: 1;
        }
        
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1.5rem;
          font-family: var(--font-ui);
          font-size: 0.9rem;
          font-weight: 500;
        }
        .status-text {
          color: var(--navy-deep);
        }
        .dash-action-card.done .status-text {
          color: #2e7d32;
        }
        .dash-action-card.locked .status-text {
          color: var(--navy-soft);
        }
        .arrow-icon {
          color: var(--gold-deep);
          transition: transform 0.2s;
        }

        .help-banner {
          background: var(--cream-card);
          border: 1px solid var(--line);
          border-left: 4px solid var(--gold-deep);
          padding: 1.5rem 2rem;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="dash-hero">
        <div className="dash-hero-content">
          <h1>Selamat Datang, {team.name || team.code}</h1>
        </div>
      </div>

      <div className="dash-grid">
        <ActionCard 
          step={1}
          title="Identitas Tim"
          desc="Lengkapi profil tim anda agar dapat mengakses materi dan mengunggah jawaban case."
          icon={<IconUser />}
          locked={false}
          done={team.biodata_completed}
          to="/biodata"
        />
        
        <ActionCard 
          step={2}
          title="Case Release"
          desc="Unduh Casebook dan Data untuk memulai pengerjaan case."
          icon={<IconDownload />}
          locked={!status.can_access_case}
          done={false}
          to="/case"
        />
        
        <ActionCard 
          step={3}
          title="Pengumpulan Case"
          desc="Unggah paper kelompok anda sebelum batas waktu berakhir."
          icon={<IconUpload />}
          locked={!status.can_submit_case}
          done={false}
          to="/submission"
        />

        {status.is_finalist && (
          <ActionCard 
            step={4}
            title="Pitch Deck Finalis"
            desc="Unggah pitch deck anda dalam format PDF untuk Final Presetation"
            icon={<IconUpload />}
            locked={!status.stages['pitch_deck']?.is_open}
            done={false}
            to="/pitch-deck"
          />
        )}
      </div>

      <div className="help-banner">
        <div>
          <h3 style={{ margin: '0 0 0.2rem', color: 'var(--navy-deep)', fontSize: '1.3rem', fontWeight: 700 }}>Butuh Bantuan?</h3>
          <p style={{ margin: 0, color: 'var(--navy-deep)', fontSize: '0.95rem' }}>Tim kepanitiaan kami siap membantu Anda.</p>
        </div>
        <div style={{ display: 'flex', gap: '2rem', fontFamily: 'var(--font-ui)', flexWrap: 'wrap' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--navy-deep)' }}>WhatsApp</span>
            <a href="https://wa.me/6285358139234" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-deep)', fontWeight: 700, textDecoration: 'none' }}>+62 853-5813-9234 (Arif)</a>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--navy-deep)' }}>Email</span>
            <a href="mailto:asiqugm@gmail.com" style={{ color: 'var(--gold-deep)', fontWeight: 700, textDecoration: 'none' }}>asiqugm@gmail.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}



