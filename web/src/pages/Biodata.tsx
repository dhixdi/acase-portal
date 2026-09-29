import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useMyStatus } from '../hooks/useMyStatus';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const memberSchema = z.object({
  full_name: z.string().min(2, "Minimal 2 karakter").max(100),
  nim: z.string().min(3).max(30).regex(/^[A-Za-z0-9]+$/, "Hanya huruf dan angka"),
  institution: z.string().min(2).max(100),
  major: z.string().min(2).max(100),
  degree_level: z.enum(["D3", "D4", "S1"]),
  batch: z.string().regex(/^\d{4}$/, "Harus 4 digit angka"),
  email: z.string().email("Email tidak valid"),
  whatsapp: z.string().regex(/^\+?[0-9]{9,15}$/, "Nomor tidak valid"),
});

const biodataSchema = z.object({
  name: z.string().min(3, "Minimal 3 karakter").max(60),
  team_size: z.union([z.literal(2), z.literal(3)]),
  consent: z.boolean(),
  leader_index: z.number().min(0).max(2),
  members: z.array(memberSchema).min(2).max(3),
}).refine(data => {
  if (!data.consent) return false;
  return true;
}, {
  message: "Anda wajib menyetujui ketentuan lomba",
  path: ["consent"]
});

type BiodataForm = z.infer<typeof biodataSchema>;

export default function Biodata() {
  const { data: status, isLoading: statusLoading } = useMyStatus();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing members if biodata is already completed
  const { data: existingMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('*').order('member_no');
      if (error) throw error;
      return data;
    },
    enabled: !!status?.team?.biodata_completed
  });

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<BiodataForm>({
    resolver: zodResolver(biodataSchema),
    defaultValues: {
      name: '',
      team_size: 3,
      consent: false,
      leader_index: 0,
      members: [
        { full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: '2023', email: '', whatsapp: '' },
        { full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: '2023', email: '', whatsapp: '' },
        { full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: '2023', email: '', whatsapp: '' }
      ]
    }
  });

  const { fields, remove, append } = useFieldArray({
    control,
    name: "members"
  });

  const teamSize = watch('team_size');
  const leaderIndex = watch('leader_index');

  useEffect(() => {
    // Prefill form if data exists
    if (status?.team?.biodata_completed && existingMembers && existingMembers.length > 0) {
      const size = status.team.team_size as 2 | 3;
      const leaderIdx = existingMembers.findIndex(m => m.is_leader);
      
      reset({
        name: status.team.name,
        team_size: size,
        consent: status.team.consent_given,
        leader_index: leaderIdx >= 0 ? leaderIdx : 0,
        members: existingMembers.map(m => ({
          full_name: m.full_name,
          nim: m.nim,
          institution: m.institution,
          major: m.major,
          degree_level: m.degree_level as "D3" | "D4" | "S1",
          batch: m.batch.toString(),
          email: m.email,
          whatsapp: m.whatsapp
        }))
      });
    }
  }, [status, existingMembers, reset]);

  // Handle changing team size
  useEffect(() => {
    if (teamSize === 2 && fields.length === 3) {
      if (confirm('Mengubah menjadi 2 anggota akan menghapus data anggota ke-3. Lanjutkan?')) {
        remove(2);
        if (leaderIndex === 2) setValue('leader_index', 0);
      } else {
        setValue('team_size', 3);
      }
    } else if (teamSize === 3 && fields.length === 2) {
      append({ full_name: '', nim: '', institution: '', major: '', degree_level: 'S1', batch: '2023', email: '', whatsapp: '' });
    }
  }, [teamSize, fields.length, remove, append, leaderIndex, setValue]);

  if (statusLoading || (status?.team?.biodata_completed && membersLoading)) {
    return <div>Memuat data...</div>;
  }

  const isEditable = status?.biodata_editable;

  const onSubmit = async (data: BiodataForm) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const payload = data.members.map((m, idx) => ({
      ...m,
      batch: parseInt(m.batch, 10),
      is_leader: idx === data.leader_index
    }));

    const { error } = await supabase.rpc('save_team_biodata', {
      p_name: data.name,
      p_team_size: data.team_size,
      p_members: payload,
      p_consent: data.consent
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg('Biodata berhasil disimpan!');
      queryClient.invalidateQueries({ queryKey: ['myStatus'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      // Clear draft logic can go here
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="text-navy">Biodata Tim</h1>
      
      {!isEditable && (
        <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', color: '#856404' }}>
          Periode pengisian biodata telah ditutup. Form ini dalam mode baca saja (Read-only). Hubungi panitia jika ada koreksi.
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#ffebee', color: 'red', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#e8f5e9', color: 'green', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{successMsg}</span>
          <button onClick={() => navigate('/case')} className="btn btn-primary">Lanjut ke Case Release</button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* STEP 1: DATA TIM */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>1. Data Tim</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Nama Kelompok</label>
              <input {...register('name')} disabled={!isEditable} style={{ width: '100%', padding: '0.5rem' }} />
              {errors.name && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.name.message}</span>}
            </div>
            
            <div>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Jumlah Anggota</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label>
                  <input type="radio" value={2} {...register('team_size', { valueAsNumber: true })} disabled={!isEditable} /> 2 Orang
                </label>
                <label>
                  <input type="radio" value={3} {...register('team_size', { valueAsNumber: true })} disabled={!isEditable} /> 3 Orang
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: ANGGOTA */}
        {fields.map((field, index) => (
          <div key={field.id} className="card" style={{ borderLeft: watch('leader_index') === index ? '4px solid var(--gold)' : '4px solid transparent' }}>
            <h2 style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between' }}>
              <span>2.{index + 1} Anggota {index + 1}</span>
              <label style={{ fontSize: '1rem', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="radio" value={index} {...register('leader_index', { valueAsNumber: true })} disabled={!isEditable} /> 
                Ketua Tim
              </label>
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block' }}>Nama Lengkap</label>
                <input {...register(`members.${index}.full_name`)} disabled={!isEditable} style={{ width: '100%', padding: '0.5rem' }} />
                {errors.members?.[index]?.full_name && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.members[index]?.full_name?.message}</span>}
              </div>
              <div>
                <label style={{ display: 'block' }}>NIM</label>
                <input {...register(`members.${index}.nim`)} disabled={!isEditable} style={{ width: '100%', padding: '0.5rem' }} />
                {errors.members?.[index]?.nim && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.members[index]?.nim?.message}</span>}
              </div>
              <div>
                <label style={{ display: 'block' }}>Asal Kampus</label>
                <input {...register(`members.${index}.institution`)} disabled={!isEditable} style={{ width: '100%', padding: '0.5rem' }} />
              </div>
              <div>
                <label style={{ display: 'block' }}>Program Studi</label>
                <input {...register(`members.${index}.major`)} disabled={!isEditable} style={{ width: '100%', padding: '0.5rem' }} />
              </div>
              <div>
                <label style={{ display: 'block' }}>Jenjang</label>
                <select {...register(`members.${index}.degree_level`)} disabled={!isEditable} style={{ width: '100%', padding: '0.5rem' }}>
                  <option value="D3">D3</option>
                  <option value="D4">D4</option>
                  <option value="S1">S1</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block' }}>Angkatan (Tahun)</label>
                <input {...register(`members.${index}.batch`)} disabled={!isEditable} placeholder="Misal: 2023" style={{ width: '100%', padding: '0.5rem' }} />
                {errors.members?.[index]?.batch && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.members[index]?.batch?.message}</span>}
              </div>
              <div>
                <label style={{ display: 'block' }}>Email</label>
                <input type="email" {...register(`members.${index}.email`)} disabled={!isEditable} style={{ width: '100%', padding: '0.5rem' }} />
              </div>
              <div>
                <label style={{ display: 'block' }}>No. WhatsApp</label>
                <input {...register(`members.${index}.whatsapp`)} disabled={!isEditable} placeholder="+6281234567890" style={{ width: '100%', padding: '0.5rem' }} />
                {errors.members?.[index]?.whatsapp && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.members[index]?.whatsapp?.message}</span>}
              </div>
            </div>
          </div>
        ))}

        {/* STEP 4: PERSETUJUAN */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>3. Persetujuan</h2>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input type="checkbox" {...register('consent')} disabled={!isEditable || status?.team?.consent_given} style={{ marginTop: '0.25rem' }} />
            <span>Saya menyatakan data benar dan menyetujui ketentuan lomba serta penggunaan data pribadi untuk keperluan penyelenggaraan ASiQ 2026.</span>
          </label>
          {errors.consent && <div style={{ color: 'red', marginTop: '0.5rem', fontSize: '0.875rem' }}>{errors.consent.message}</div>}
        </div>

        {isEditable && (
          <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.1rem' }}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Biodata'}
          </button>
        )}
      </form>
    </div>
  );
}
