-- ============================================================
-- 0002_functions.sql
-- ============================================================

-- ---------- Helper dasar ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.current_team_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.teams where user_id = auth.uid() and is_active;
$$;

create or replace function public.server_now() returns timestamptz
language sql stable as $$ select now(); $$;

-- Tahap terbuka untuk tim tertentu (memperhitungkan override deadline).
create or replace function public.stage_is_open(p_team uuid, p_stage text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.stages s
    where s.key = p_stage
      and now() >= s.opens_at
      and now() < coalesce(
            (select o.closes_at from public.deadline_overrides o
              where o.team_id = p_team and o.stage = p_stage),
            s.closes_at,
            'infinity'::timestamptz)
  );
$$;

create or replace function public.is_finalist(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.finalists f where f.team_id = p_team and f.published);
$$;

-- Biodata masih boleh diedit sampai deadline efektif case_submission.
create or replace function public.biodata_editable(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select now() < coalesce(o.closes_at, s.closes_at, 'infinity'::timestamptz)
    from public.stages s
    left join public.deadline_overrides o on o.team_id = p_team and o.stage = s.key
    where s.key = 'case_submission'
  ), true);
$$;

-- Materi case: tim aktif + biodata lengkap + sudah waktu rilis.
create or replace function public.can_access_case() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teams t
    where t.user_id = auth.uid()
      and t.is_active
      and t.biodata_completed_at is not null
      and public.stage_is_open(t.id, 'case_release')
  );
$$;

-- Boleh upload/timpa/hapus submission?
create or replace function public.can_submit(p_team uuid, p_stage text) returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from public.teams t
             where t.id = p_team and t.user_id = auth.uid()
               and t.is_active and t.biodata_completed_at is not null)
    and p_stage in ('case_submission','pitch_deck')
    and public.stage_is_open(p_team, p_stage)
    and (p_stage <> 'pitch_deck' or public.is_finalist(p_team));
$$;

create or replace function public.can_read_announcement(p_audience text, p_published boolean, p_published_at timestamptz)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_published, false)
    and p_published_at <= now()
    and (
      p_audience = 'public'
      or (p_audience = 'participants' and exists (
            select 1 from public.teams t where t.user_id = auth.uid() and t.is_active))
      or (p_audience = 'finalists' and exists (
            select 1 from public.teams t
              join public.finalists f on f.team_id = t.id and f.published
             where t.user_id = auth.uid() and t.is_active))
    );
$$;

-- ---------- Status ringkas untuk frontend (semua logika dihitung di server) ----------
create or replace function public.my_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_team public.teams;
begin
  select * into v_team from public.teams where user_id = auth.uid();
  if not found then
    return jsonb_build_object('has_team', false, 'server_now', now());
  end if;

  return jsonb_build_object(
    'has_team', true,
    'server_now', now(),
    'team', jsonb_build_object(
      'id', v_team.id,
      'code', v_team.code,
      'name', v_team.name,
      'team_size', v_team.team_size,
      'category', v_team.category,
      'is_active', v_team.is_active,
      'payment_verified', v_team.payment_verified,
      'biodata_completed', v_team.biodata_completed_at is not null,
      'consent_given', v_team.consent_at is not null,
      'student_proof_path', v_team.student_proof_path
    ),
    'is_finalist', public.is_finalist(v_team.id),
    'biodata_editable', public.biodata_editable(v_team.id),
    'can_access_case', public.can_access_case(),
    'can_submit_case', public.can_submit(v_team.id, 'case_submission'),
    'can_submit_pitch', public.can_submit(v_team.id, 'pitch_deck'),
    'stages', (
      select coalesce(jsonb_object_agg(s.key, jsonb_build_object(
                'label', s.label,
                'opens_at', s.opens_at,
                'closes_at', coalesce(o.closes_at, s.closes_at),
                'is_open', public.stage_is_open(v_team.id, s.key)
              )), '{}'::jsonb)
      from public.stages s
      left join public.deadline_overrides o on o.team_id = v_team.id and o.stage = s.key
    )
  );
end;
$$;

-- ---------- Simpan biodata (transaksional, satu-satunya jalur tulis peserta) ----------
create or replace function public.save_team_biodata(
  p_name      text,
  p_team_size int,
  p_members   jsonb,
  p_consent   boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_team    public.teams;
  v_m       jsonb;
  v_i       int := 0;
  v_leaders int := 0;
  v_name    text := btrim(coalesce(p_name, ''));
begin
  select * into v_team from public.teams where user_id = auth.uid() and is_active;
  if not found then
    raise exception 'Akun tim tidak ditemukan atau dinonaktifkan' using errcode = '42501';
  end if;

  if not public.biodata_editable(v_team.id) then
    raise exception 'Periode pengisian biodata sudah ditutup' using errcode = '42501';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 60 then
    raise exception 'Nama kelompok harus 3-60 karakter';
  end if;
  if exists (select 1 from public.teams where lower(name) = lower(v_name) and id <> v_team.id) then
    raise exception 'Nama kelompok sudah dipakai tim lain';
  end if;
  if p_team_size is null or p_team_size not in (2,3) then
    raise exception 'Jumlah anggota harus 2 atau 3';
  end if;
  if p_consent is not true and v_team.consent_at is null then
    raise exception 'Persetujuan wajib dicentang';
  end if;
  if p_members is null or jsonb_typeof(p_members) <> 'array'
     or jsonb_array_length(p_members) <> p_team_size then
    raise exception 'Jumlah data anggota harus sama dengan jumlah anggota tim';
  end if;

  delete from public.team_members where team_id = v_team.id;

  for v_m in select * from jsonb_array_elements(p_members) loop
    v_i := v_i + 1;

    if coalesce(btrim(v_m->>'full_name'), '') = ''
       or coalesce(btrim(v_m->>'nim'), '') = ''
       or coalesce(btrim(v_m->>'institution'), '') = ''
       or coalesce(btrim(v_m->>'major'), '') = ''
       or coalesce(btrim(v_m->>'email'), '') = ''
       or coalesce(btrim(v_m->>'whatsapp'), '') = '' then
      raise exception 'Data anggota % belum lengkap', v_i;
    end if;
    if coalesce(v_m->>'degree_level', '') not in ('D3','D4','S1') then
      raise exception 'Jenjang anggota % tidak valid', v_i;
    end if;
    if coalesce(v_m->>'batch', '') !~ '^[0-9]{4}$' then
      raise exception 'Angkatan anggota % tidak valid', v_i;
    end if;
    if btrim(v_m->>'email') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Email anggota % tidak valid', v_i;
    end if;
    if btrim(v_m->>'whatsapp') !~ '^\+?[0-9]{9,15}$' then
      raise exception 'Nomor WhatsApp anggota % tidak valid', v_i;
    end if;

    insert into public.team_members
      (team_id, member_no, is_leader, full_name, nim, institution, major, degree_level, batch, email, whatsapp)
    values (
      v_team.id, v_i,
      coalesce((v_m->>'is_leader')::boolean, false),
      btrim(v_m->>'full_name'), btrim(v_m->>'nim'), btrim(v_m->>'institution'), btrim(v_m->>'major'),
      v_m->>'degree_level', (v_m->>'batch')::smallint,
      lower(btrim(v_m->>'email')), btrim(v_m->>'whatsapp')
    );

    if coalesce((v_m->>'is_leader')::boolean, false) then
      v_leaders := v_leaders + 1;
    end if;
  end loop;

  if v_leaders <> 1 then
    raise exception 'Harus ada tepat satu ketua tim';
  end if;

  update public.teams
     set name = v_name,
         team_size = p_team_size,
         consent_at = coalesce(consent_at, now()),
         biodata_completed_at = coalesce(biodata_completed_at, now())
   where id = v_team.id;

  insert into public.audit_log (actor, action, entity, entity_id, details)
  values (auth.uid(), 'biodata_saved', 'team', v_team.id::text,
          jsonb_build_object('team_size', p_team_size));
end;
$$;

-- Simpan path bukti mahasiswa aktif (opsional).
create or replace function public.set_student_proof(p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare v_team public.teams;
begin
  select * into v_team from public.teams where user_id = auth.uid() and is_active;
  if not found then raise exception 'Akun tim tidak ditemukan' using errcode = '42501'; end if;
  if p_path is not null and p_path <> v_team.id::text || '/proof.pdf'
                        and p_path <> v_team.id::text || '/proof.jpg'
                        and p_path <> v_team.id::text || '/proof.png' then
    raise exception 'Path bukti tidak valid';
  end if;
  update public.teams set student_proof_path = p_path where id = v_team.id;
end;
$$;

-- ---------- Trigger ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger trg_teams_updated before update on public.teams
  for each row execute function public.set_updated_at();
create trigger trg_submissions_updated before update on public.submissions
  for each row execute function public.set_updated_at();

create or replace function public.log_submission_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into public.submission_events (team_id, stage, slot, action, file_size)
    values (old.team_id, old.stage, old.slot, 'delete', old.file_size);
    return old;
  elsif tg_op = 'INSERT' then
    insert into public.submission_events (team_id, stage, slot, action, file_size)
    values (new.team_id, new.stage, new.slot, 'upload', new.file_size);
    return new;
  else
    insert into public.submission_events (team_id, stage, slot, action, file_size)
    values (new.team_id, new.stage, new.slot, 'replace', new.file_size);
    return new;
  end if;
end;
$$;

create trigger trg_submission_events after insert or update or delete on public.submissions
  for each row execute function public.log_submission_event();

-- ---------- Izin eksekusi ----------
-- Default Supabase memberi EXECUTE ke anon/authenticated. Cabut lalu beri seperlunya.
do $$
declare f text;
begin
  foreach f in array array[
    'is_admin()','current_team_id()','stage_is_open(uuid,text)','is_finalist(uuid)',
    'biodata_editable(uuid)','can_access_case()','can_submit(uuid,text)',
    'my_status()','save_team_biodata(text,int,jsonb,boolean)','set_student_proof(text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

revoke all on function public.can_read_announcement(text,boolean,timestamptz) from public;
grant execute on function public.can_read_announcement(text,boolean,timestamptz) to anon, authenticated;

revoke all on function public.server_now() from public;
grant execute on function public.server_now() to anon, authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.log_submission_event() from public, anon, authenticated;
