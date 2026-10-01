
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Ya', isDestructive = false }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(22, 30, 48, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'var(--font-ui)'
    }}>
      <div style={{
        background: 'var(--cream)',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '450px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        position: 'relative'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--navy-deep)', fontSize: '1.25rem', fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: '0 0 1.5rem 0', color: 'var(--navy-soft)', fontSize: '0.95rem', lineHeight: 1.6 }}>{message}</p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button 
            onClick={onCancel}
            className="btn btn-ghost" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: 'var(--mist)', color: 'var(--navy-deep)' }}
          >
            Batal
          </button>
          <button 
            onClick={() => { onConfirm(); onCancel(); }}
            className="btn btn-primary" 
            style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.85rem',
              backgroundColor: isDestructive ? '#d32f2f' : 'var(--gold)',
              borderColor: isDestructive ? '#d32f2f' : 'var(--gold)',
              color: isDestructive ? 'white' : 'var(--navy-deep)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
