import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMyStatus } from '../hooks/useMyStatus';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

type Member = {
  is_leader: boolean;
  full_name: string;
  nim: string;
  institution: string;
  major: string;
  degree_level: 'D3'|'D4'|'S1';
  batch: number;
  email: string;
  whatsapp: string;
};

type BiodataForm = {
  name: string;
  team_size: number;
  members: Member[];
  consent: boolean;
};

export default function Biodata() {
  const { data: status, isLoading } = useMyStatus();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status?.team?.biodata_completed) {
      navigate('/profile', { replace: true });
    }
  }, [status, navigate]);

  const { register, control, handleSubmit, watch, reset, trigger } = useForm<BiodataForm>({
    defaultValues: {
      name: '',
      team_size: 3,
      members: [
        { is_leader: true, full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: 2023, email: '', whatsapp: '' },
        { is_leader: false, full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: 2023, email: '', whatsapp: '' },
        { is_leader: false, full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: 2023, email: '', whatsapp: '' }
      ],
      consent: false
    }
  });

  const { fields, replace } = useFieldArray({ control, name: 'members' });
  const teamSize = watch('team_size');

  useEffect(() => {
    if (status?.team) {
      const t = status.team as any;
      const formatWA = (wa: string) => wa ? wa.replace(/^\+62/, '').replace(/^0/, '') : '';
      
      reset({
        name: t.name || '',
        team_size: t.team_size || 3,
        members: t.members && t.members.length > 0 
          ? t.members.map((m: any) => ({ ...m, whatsapp: formatWA(m.whatsapp) }))
          : [
          { is_leader: true, full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: 2023, email: '', whatsapp: '' },
          { is_leader: false, full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: 2023, email: '', whatsapp: '' },
          { is_leader: false, full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: 2023, email: '', whatsapp: '' }
        ],
        consent: !!t.consent_given
      });
    }
  }, [status, reset]);

  // Handle team size changes
  useEffect(() => {
    const currentMembers = watch('members');
    if (teamSize == 2 && currentMembers.length > 2) {
      replace(currentMembers.slice(0, 2));
    } else if (teamSize == 3 && currentMembers.length < 3) {
      replace([...currentMembers, { is_leader: false, full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: 2023, email: '', whatsapp: '' }]);
    }
  }, [teamSize, replace, watch]);

  if (isLoading) return <div className="wrap" style={{ padding: '2rem' }}>Memuat...</div>;

  const isEditable = status?.biodata_editable !== false;
  const teamData = status?.team as any;

  // Total steps:
  // Step 1: Info Tim
  // Step 2: Ketua (Anggota 1)
  // Step 3: Anggota 2
  // Step 4: Anggota 3 (only if team_size == 3)
  // Step 5: Persetujuan (If team_size==2, this is Step 4)
  const maxStep = teamSize == 3 ? 5 : 4;

  const nextStep = async () => {
    // Validate current step
    let valid = false;
    if (step === 1) {
      valid = await trigger(['name', 'team_size']);
    } else if (step === 2) {
      valid = await trigger(`members.0` as any);
    } else if (step === 3) {
      valid = await trigger(`members.1` as any);
    } else if (step === 4 && teamSize == 3) {
      valid = await trigger(`members.2` as any);
    }

    if (valid) {
      setStep(s => Math.min(maxStep, s + 1));
    } else {
      toast.error('Mohon lengkapi semua isian yang wajib dengan benar sebelum melanjutkan.');
    }
  };

  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const onSubmit = async (data: BiodataForm) => {
    if (!isEditable) return;
    setSaving(true);
    
    const formattedMembers = data.members.map(m => ({
      ...m,
      whatsapp: `+62${m.whatsapp.replace(/^0/, '')}`
    }));

    const { error } = await supabase.rpc('save_team_biodata', {
      p_name: data.name,
      p_team_size: data.team_size,
      p_members: formattedMembers,
      p_consent: data.consent
    });
    setSaving(false);

    if (error) {
      toast.error('Gagal menyimpan: ' + error.message);
    } else {
      toast.success('Biodata berhasil disimpan!');
      navigate('/profile');
    }
  };

  const renderInput = (label: string, field: any, type="text", req=true) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--navy-deep)' }}>
        {label} {req && <span style={{color: 'red'}}>*</span>}
      </label>
      <input type={type} {...field} required={req} disabled={!isEditable} style={{ width: '100%', padding: '0.6rem' }} />
    </div>
  );

  return (
    <div>
      <h1 className="text-navy">Biodata Tim</h1>
      
      {!isEditable && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
          Waktu pengisian biodata sudah ditutup. Data bersifat read-only.
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {Array.from({ length: maxStep }).map((_, i) => (
          <div key={i} style={{ 
            flex: 1, 
            height: '6px', 
            background: step >= i + 1 ? 'var(--gold)' : '#ddd',
            borderRadius: '4px',
            transition: 'background 0.3s'
          }} />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card">
        
        {/* STEP 1: INFO TIM */}
        <div style={{ display: step === 1 ? 'block' : 'none' }}>
          <h2 style={{ marginTop: 0 }}>Langkah 1: Identitas Tim</h2>
          <p style={{ color: 'var(--mist)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Tentukan nama kelompok yang merepresentasikan semangat Anda.</p>
          
          {renderInput('Nama Kelompok (3-60 karakter)', register('name', { required: true, minLength: 3, maxLength: 60 }))}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--navy-deep)' }}>Jumlah Anggota Tim <span style={{color:'red'}}>*</span></label>
            <select {...register('team_size', { valueAsNumber: true })} disabled={!isEditable} style={{ width: '100%', padding: '0.6rem' }}>
              <option value={2}>2 Orang</option>
              <option value={3}>3 Orang</option>
            </select>
          </div>
        </div>

        {/* STEPS FOR MEMBERS */}
        {fields.map((field, index) => {
          const stepNumber = index + 2;
          return (
            <div key={field.id} style={{ display: step === stepNumber ? 'block' : 'none' }}>
              <h2 style={{ marginTop: 0 }}>Langkah {stepNumber}: Anggota {index + 1} {index === 0 ? '(Ketua)' : ''}</h2>
              <p style={{ color: 'var(--mist)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Lengkapi identitas diri anggota ini dengan data yang valid.</p>
              
              <div className="grid-2">
                {renderInput('Nama Lengkap', register(`members.${index}.full_name`, { required: true }))}
                {renderInput('NIM / NIS', register(`members.${index}.nim`, { required: true }))}
              </div>
              <div className="grid-2">
                {renderInput('Asal Instansi/Universitas', register(`members.${index}.institution`, { required: true }))}
                {renderInput('Program Studi', register(`members.${index}.major`, { required: true }))}
              </div>
              <div className="grid-2">
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--navy-deep)' }}>Jenjang <span style={{color:'red'}}>*</span></label>
                  <select {...register(`members.${index}.degree_level`)} disabled={!isEditable} style={{ width: '100%', padding: '0.6rem' }}>
                    <option value="S1">S1 / Sarjana Terapan</option>
                    <option value="D4">D4</option>
                    <option value="D3">D3</option>
                  </select>
                </div>
                {renderInput('Tahun Angkatan', register(`members.${index}.batch`, { required: true, valueAsNumber: true, min: 2015, max: 2035 }), "number")}
              </div>
              <div className="grid-2">
                {renderInput('Email Valid', register(`members.${index}.email`, { required: true, pattern: /^\S+@\S+$/i }), "email")}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--navy-deep)' }}>
                    WhatsApp <span style={{color: 'red'}}>*</span>
                  </label>
                  <div style={{ display: 'flex', border: '1px solid var(--gold-deep)', borderRadius: '2px', overflow: 'hidden' }}>
                    <span style={{ padding: '0.6rem 0.8rem', background: '#e9e2d5', color: 'var(--navy-deep)', borderRight: '1px solid var(--gold-deep)', fontWeight: 500 }}>
                      +62
                    </span>
                    <input 
                      type="tel" 
                      {...register(`members.${index}.whatsapp`, { required: true, pattern: /^[0-9]{8,15}$/ })} 
                      disabled={!isEditable} 
                      placeholder="81234567890"
                      style={{ width: '100%', padding: '0.6rem', border: 'none', outline: 'none' }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* LAST STEP: PERSETUJUAN */}
        <div style={{ display: step === maxStep ? 'block' : 'none' }}>
          <h2 style={{ marginTop: 0 }}>Langkah {maxStep}: Konfirmasi Final</h2>
          <div style={{ background: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            <strong>PERHATIAN:</strong> Harap periksa kembali seluruh isian Anda. Setelah dikirim, data biodata ini <strong>TIDAK DAPAT DIUBAH LAGI</strong> dan akan terkunci permanen.
          </div>
          
          <div style={{ padding: '1rem', background: 'rgba(196,167,97,.08)', borderLeft: '3px solid var(--gold)', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: isEditable ? 'pointer' : 'default' }}>
              <input type="checkbox" {...register('consent', { required: true })} disabled={!isEditable || teamData?.consent_given} style={{ marginTop: '0.25rem', transform: 'scale(1.2)' }} />
              <span style={{ fontSize: '0.95rem' }}>Saya menyatakan bahwa seluruh data yang diisi adalah benar, dan saya mengerti bahwa data ini tidak dapat diubah setelah disubmit. Saya menyetujui ketentuan lomba serta penggunaan data pribadi untuk keperluan administrasi ASiQ 2026.</span>
            </label>
          </div>
        </div>

        {/* NAVIGATION BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', borderTop: '1px solid var(--line-soft)', paddingTop: '1.5rem' }}>
          {step > 1 ? (
            <button type="button" onClick={prevStep} className="btn btn-ghost">
              &laquo; Sebelumnya
            </button>
          ) : <div></div>}
          
          {step < maxStep ? (
            <button type="button" onClick={nextStep} className="btn btn-primary">
              Selanjutnya &raquo;
            </button>
          ) : (
            isEditable ? (
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Menyimpan...' : 'Simpan Final'}
              </button>
            ) : (
              <button type="button" onClick={() => navigate('/')} className="btn btn-primary">
                Kembali ke Beranda
              </button>
            )
          )}
        </div>

      </form>
    </div>
  );
}
