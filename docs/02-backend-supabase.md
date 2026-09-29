# 02 — Backend (Supabase)

Semua SQL di bawah harus disimpan sebagai file migrasi terpisah di `supabase/migrations/` dan dijalankan **berurutan** lewat **SQL Editor** Supabase (peran `postgres`, supaya pemilik fungsi = `postgres` dan fungsi `SECURITY DEFINER` melewati RLS sebagaimana mestinya).

> **Prinsip:** database adalah penegak aturan. Frontend hanyalah antarmuka. Jika frontend dimodifikasi lewat DevTools, aturan tetap harus utuh.

## 0. Persiapan project

1. Buat project Supabase baru, region **Southeast Asia (Singapore)**. Catat *Project URL* dan *anon key* (Settings → API). Simpan *service_role key* **hanya** di laptop admin.
2. (Disarankan) Buat project kedua sebagai **staging** (free tier mengizinkan 2 project aktif). Jalankan semua migrasi di staging dulu.
3. Authentication → **Sign In / Providers**: matikan **Allow new users to sign up**. Email provider tetap aktif. Aktifkan minimum password length 8.
4. Authentication → **URL Configuration**: isi *Site URL* dengan domain portal final; tambahkan Redirect URLs yang sama (dan `http://localhost:5173` untuk pengembangan).
5. (Opsional, hanya bila memakai reset password lewat email) Authentication → SMTP Settings: pasang custom SMTP. SMTP bawaan Supabase sangat terbatas dan tidak cocok untuk produksi.

## 1. `0001_tables.sql`

```sql
-- ============================================================
-- 0001_tables.sql
-- ============================================================

-- Daftar admin. Tidak dapat diakses lewat API (tanpa policy).
create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Tahap lomba dan jadwalnya.
create table public.stages (
  key       text primary key check (key in ('case_release','case_submission','pitch_deck')),
  label     text not null,
  opens_at  timestamptz not null,
  closes_at timestamptz,
  check (closes_at is null or closes_at > opens_at)
);

-- Tim peserta (1 akun = 1 tim). Dibuat oleh skrip admin, BUKAN oleh peserta.
create table public.teams (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references auth.users(id) on delete cascade,
  code                 text not null unique,                       -- ACASE-001
  login_email          text,
  name                 text,                                       -- diisi saat biodata
  team_size            smallint check (team_size in (2,3)),
  category             text not null default 'regular' check (category in ('early_bird','regular')),
  payment_verified     boolean not null default false,
  is_active            boolean not null default true,
  consent_at           timestamptz,
  biodata_completed_at timestamptz,
  student_proof_path   text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index teams_name_lower_uidx on public.teams (lower(name)) where name is not null;

-- Catatan internal panitia (terpisah agar tidak pernah terbaca peserta).
create table public.team_admin_notes (
  team_id    uuid primary key references public.teams(id) on delete cascade,
  note       text not null default '',
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  member_no    smallint not null check (member_no between 1 and 3),
  is_leader    boolean not null default false,
  full_name    text not null,
  nim          text not null,
  institution  text not null,
  major        text not null,
  degree_level text not null check (degree_level in ('D3','D4','S1')),
  batch        smallint not null check (batch between 2015 and 2035),
  email        text not null,
  whatsapp     text not null,
  unique (team_id, member_no)
);
create unique index team_members_one_leader_uidx on public.team_members (team_id) where is_leader;

create table public.case_materials (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  file_path   text not null,          -- path di bucket case-files
  file_name   text not null,
  file_size   bigint,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.submissions (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  stage      text not null references public.stages(key) check (stage in ('case_submission','pitch_deck')),
  slot       text not null default 'main' check (slot in ('main','attachment')),
  file_path  text not null,
  file_name  text not null,           -- nama file asli dari peserta
  file_size  bigint not null check (file_size > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, stage, slot),
  -- path dikunci: {team_id}/{stage}/main.pdf atau attachment.zip
  check (file_path = team_id::text || '/' || stage || '/' ||
         (case slot when 'main' then 'main.pdf' else 'attachment.zip' end))
);

create table public.submission_events (
  id         bigint generated always as identity primary key,
  team_id    uuid not null references public.teams(id) on delete cascade,
  stage      text not null,
  slot       text not null,
  action     text not null check (action in ('upload','replace','delete')),
  file_size  bigint,
  created_at timestamptz not null default now()
);

create table public.deadline_overrides (
  team_id    uuid not null references public.teams(id) on delete cascade,
  stage      text not null references public.stages(key),
  closes_at  timestamptz not null,
  note       text,
  created_at timestamptz not null default now(),
  primary key (team_id, stage)
);

create table public.finalists (
  team_id    uuid primary key references public.teams(id) on delete cascade,
  published  boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,                       -- Markdown
  audience     text not null default 'public' check (audience in ('public','participants','finalists')),
  pinned       boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor      uuid,
  action     text not null,
  entity     text,
  entity_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);

create index submissions_team_idx on public.submissions (team_id);
create index team_members_team_idx on public.team_members (team_id);
create index announcements_pub_idx on public.announcements (is_published, published_at desc);
create index audit_log_created_idx on public.audit_log (created_at desc);
```

## 2. `0002_functions.sql`

Urutan definisi penting (fungsi SQL divalidasi saat dibuat).

```sql
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
```

## 3. `0003_rls.sql`

Pola `(select auth.uid())` / `(select public.fn())` membuat Postgres menghitung sekali per query (lebih cepat).

```sql
-- ============================================================
-- 0003_rls.sql
-- ============================================================
alter table public.admins             enable row level security;   -- tanpa policy = tertutup untuk API
alter table public.stages             enable row level security;
alter table public.teams              enable row level security;
alter table public.team_admin_notes   enable row level security;
alter table public.team_members       enable row level security;
alter table public.case_materials     enable row level security;
alter table public.submissions        enable row level security;
alter table public.submission_events  enable row level security;
alter table public.deadline_overrides enable row level security;
alter table public.finalists          enable row level security;
alter table public.announcements      enable row level security;
alter table public.audit_log          enable row level security;

-- stages: jadwal boleh dibaca siapa saja; ubah hanya admin
create policy stages_read  on public.stages for select to anon, authenticated using (true);
create policy stages_admin on public.stages for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- teams: peserta hanya baca miliknya; tulis hanya admin (peserta lewat RPC)
create policy teams_read_own on public.teams for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy teams_admin on public.teams for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy notes_admin on public.team_admin_notes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- team_members: baca milik sendiri; tulis hanya admin (peserta lewat RPC)
create policy members_read_own on public.team_members for select to authenticated
  using (team_id = (select public.current_team_id()) or (select public.is_admin()));
create policy members_admin on public.team_members for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- case_materials: metadata pun dikunci waktu + biodata
create policy case_read on public.case_materials for select to authenticated
  using ((select public.can_access_case()) or (select public.is_admin()));
create policy case_admin on public.case_materials for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- submissions
create policy sub_read on public.submissions for select to authenticated
  using (team_id = (select public.current_team_id()) or (select public.is_admin()));
create policy sub_insert on public.submissions for insert to authenticated
  with check (team_id = (select public.current_team_id()) and public.can_submit(team_id, stage));
create policy sub_update on public.submissions for update to authenticated
  using      (team_id = (select public.current_team_id()) and public.can_submit(team_id, stage))
  with check (team_id = (select public.current_team_id()) and public.can_submit(team_id, stage));
create policy sub_delete on public.submissions for delete to authenticated
  using (team_id = (select public.current_team_id()) and public.can_submit(team_id, stage));
create policy sub_admin on public.submissions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- submission_events, audit_log: hanya admin
create policy events_admin on public.submission_events for select to authenticated
  using ((select public.is_admin()));
create policy audit_admin_read on public.audit_log for select to authenticated
  using ((select public.is_admin()));
create policy audit_admin_insert on public.audit_log for insert to authenticated
  with check ((select public.is_admin()) and actor = (select auth.uid()));

-- deadline_overrides: tim melihat miliknya (untuk countdown), admin kelola
create policy ovr_read_own on public.deadline_overrides for select to authenticated
  using (team_id = (select public.current_team_id()) or (select public.is_admin()));
create policy ovr_admin on public.deadline_overrides for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- finalists: tim melihat status miliknya hanya bila published; admin kelola
create policy fin_read_own on public.finalists for select to authenticated
  using ((published and team_id = (select public.current_team_id())) or (select public.is_admin()));
create policy fin_admin on public.finalists for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- announcements: filter audiens + waktu terbit
create policy ann_read on public.announcements for select to anon, authenticated
  using (public.can_read_announcement(audience, is_published, published_at));
create policy ann_admin on public.announcements for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
```

## 4. `0004_views.sql`

```sql
-- ============================================================
-- 0004_views.sql
-- ============================================================

-- Untuk admin: ringkasan per tim. security_invoker = RLS pemanggil berlaku
-- (non-admin hanya akan melihat timnya sendiri).
create or replace view public.admin_team_overview
with (security_invoker = true) as
select
  t.id, t.code, t.name, t.login_email, t.team_size, t.category,
  t.payment_verified, t.is_active, t.biodata_completed_at, t.consent_at,
  (select m.full_name from public.team_members m where m.team_id = t.id and m.is_leader) as leader_name,
  (select m.email     from public.team_members m where m.team_id = t.id and m.is_leader) as leader_email,
  (select m.whatsapp  from public.team_members m where m.team_id = t.id and m.is_leader) as leader_whatsapp,
  (select string_agg(distinct m.institution, ', ' order by m.institution)
     from public.team_members m where m.team_id = t.id) as institutions,
  (select s.updated_at from public.submissions s
    where s.team_id = t.id and s.stage = 'case_submission' and s.slot = 'main') as case_submitted_at,
  (select s.file_size from public.submissions s
    where s.team_id = t.id and s.stage = 'case_submission' and s.slot = 'main') as case_file_size,
  (select s.updated_at from public.submissions s
    where s.team_id = t.id and s.stage = 'pitch_deck' and s.slot = 'main') as pitch_submitted_at,
  exists (select 1 from public.finalists f where f.team_id = t.id)                  as is_finalist,
  exists (select 1 from public.finalists f where f.team_id = t.id and f.published)  as finalist_published,
  (select o.closes_at from public.deadline_overrides o
    where o.team_id = t.id and o.stage = 'case_submission')                         as case_override_closes_at
from public.teams t;

-- Publik: daftar finalis yang SUDAH dipublikasikan. Sengaja dijalankan dengan hak pemilik
-- (bukan security_invoker) agar anon bisa membaca; hanya membuka kode, nama tim, kampus.
create or replace view public.public_finalists as
select
  t.code,
  t.name,
  (select string_agg(distinct m.institution, ', ' order by m.institution)
     from public.team_members m where m.team_id = t.id) as institutions
from public.finalists f
join public.teams t on t.id = f.team_id
where f.published;
```

> Linter Supabase mungkin memberi peringatan "Security Definer View" untuk `public_finalists`. Itu disengaja dan dapat diabaikan karena kolom yang dibuka minimal.

## 5. `0005_storage.sql`

Jika `insert into storage.buckets` ditolak di lingkungan tertentu, buat bucket lewat dashboard dengan pengaturan yang sama (semua **private**), lalu jalankan bagian policy saja.

```sql
-- ============================================================
-- 0005_storage.sql
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('case-files',     'case-files',     false, 52428800,
     array['application/pdf','application/zip','application/x-zip-compressed','text/csv',
           'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('submissions',    'submissions',    false, 10485760,
     array['application/pdf','application/zip','application/x-zip-compressed']),
  ('student-proofs', 'student-proofs', false, 2097152,
     array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- case-files ----------
create policy "case-files read" on storage.objects for select to authenticated
  using (bucket_id = 'case-files' and (public.can_access_case() or public.is_admin()));
create policy "case-files admin write" on storage.objects for all to authenticated
  using (bucket_id = 'case-files' and public.is_admin())
  with check (bucket_id = 'case-files' and public.is_admin());

-- ---------- submissions (path: {team_id}/{stage}/main.pdf | attachment.zip) ----------
create policy "submissions read own" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and (
           (storage.foldername(name))[1] = public.current_team_id()::text
           or public.is_admin()));

create policy "submissions insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = public.current_team_id()::text
    and public.can_submit(public.current_team_id(), (storage.foldername(name))[2])
    and storage.filename(name) in ('main.pdf','attachment.zip')
  );

create policy "submissions update" on storage.objects for update to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = public.current_team_id()::text
    and public.can_submit(public.current_team_id(), (storage.foldername(name))[2])
  )
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = public.current_team_id()::text
    and public.can_submit(public.current_team_id(), (storage.foldername(name))[2])
    and storage.filename(name) in ('main.pdf','attachment.zip')
  );

create policy "submissions delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = public.current_team_id()::text
    and public.can_submit(public.current_team_id(), (storage.foldername(name))[2])
  );

create policy "submissions admin" on storage.objects for all to authenticated
  using (bucket_id = 'submissions' and public.is_admin())
  with check (bucket_id = 'submissions' and public.is_admin());

-- ---------- student-proofs (path: {team_id}/proof.pdf|jpg|png) ----------
create policy "proofs read own" on storage.objects for select to authenticated
  using (bucket_id = 'student-proofs' and (
           (storage.foldername(name))[1] = public.current_team_id()::text or public.is_admin()));
create policy "proofs write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'student-proofs'
              and (storage.foldername(name))[1] = public.current_team_id()::text
              and public.biodata_editable(public.current_team_id())
              and storage.filename(name) in ('proof.pdf','proof.jpg','proof.png'));
create policy "proofs update own" on storage.objects for update to authenticated
  using (bucket_id = 'student-proofs'
         and (storage.foldername(name))[1] = public.current_team_id()::text
         and public.biodata_editable(public.current_team_id()))
  with check (bucket_id = 'student-proofs'
              and (storage.foldername(name))[1] = public.current_team_id()::text
              and storage.filename(name) in ('proof.pdf','proof.jpg','proof.png'));
create policy "proofs admin" on storage.objects for all to authenticated
  using (bucket_id = 'student-proofs' and public.is_admin())
  with check (bucket_id = 'student-proofs' and public.is_admin());
```

**Catatan storage:**
- Unggah dengan `upsert: true` memerlukan policy INSERT **dan** UPDATE **dan** SELECT (semua sudah ada).
- Objek storage tidak ikut terhapus saat tim dihapus dari database; hapus manual bila perlu.
- Jangan menaruh nama kelompok di path. Nama kelompok hanya dipakai saat menyusun ZIP di klien admin.

## 6. `0006_hardening.sql`

```sql
-- ============================================================
-- 0006_hardening.sql
-- ============================================================
-- anon hanya boleh membaca: stages, announcements (dibatasi RLS), public_finalists
revoke all on all tables in schema public from anon;
grant select on public.stages, public.announcements, public.public_finalists to anon;

-- admins tidak boleh disentuh lewat API sama sekali
revoke all on public.admins from anon, authenticated;

-- view admin: hanya untuk authenticated (RLS pemanggil tetap berlaku)
grant select on public.admin_team_overview to authenticated;
grant select on public.public_finalists to authenticated;
```

## 7. `0007_seed.sql`

```sql
-- ============================================================
-- 0007_seed.sql  (ubah tanggal/jam sesuai keputusan panitia; semua WIB = +07)
-- ============================================================
insert into public.stages (key, label, opens_at, closes_at) values
  ('case_release',    'Case Release',          '2026-10-02 08:00:00+07', null),
  ('case_submission', 'Case Submission',       '2026-10-02 08:00:00+07', '2026-10-29 23:59:59+07'),
  ('pitch_deck',      'Pitch Deck Submission', '2026-11-21 00:00:00+07', '2026-11-26 23:59:59+07')
on conflict (key) do update
  set label = excluded.label, opens_at = excluded.opens_at, closes_at = excluded.closes_at;
```

## 8. Membuat admin

1. Dashboard → Authentication → Users → **Add user** → isi email + password kuat, centang *Auto Confirm User*.
2. Jalankan (`scripts/make-admin.sql`):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'GANTI_DENGAN_EMAIL_ADMIN'
on conflict do nothing;
```

3. Ulangi untuk setiap panitia yang memerlukan akses admin. Sebaiknya 2–3 orang saja.

## 9. Skrip akun tim (dijalankan LOKAL)

`scripts/package.json`:

```json
{
  "name": "acase-admin-scripts",
  "private": true,
  "type": "module",
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "csv-parse": "^5"
  }
}
```

Tambahkan ke `.gitignore` di root repo: `scripts/credentials-*.csv`, `.env`, `scripts/.env`.

### `scripts/create-accounts.mjs`

Input CSV (`participants.csv`), header wajib `email`, kolom opsional `category` (`early_bird`/`regular`) dan `payment_verified` (`true`/`false`):

```
email,category,payment_verified
ketua1@gmail.com,early_bird,true
ketua2@gmail.com,regular,true
```

```js
// Pemakaian:
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//   node create-accounts.mjs participants.csv
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const file = process.argv[2];
if (!file) { console.error('Pemakaian: node create-accounts.mjs participants.csv'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// tanpa karakter ambigu (0/O, 1/l/I)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const genPassword = (len = 12) =>
  Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const rows = parse(readFileSync(file, 'utf8'), { columns: true, skip_empty_lines: true, trim: true });

// nomor kode berikutnya
const { data: last, error: lastErr } = await sb
  .from('teams').select('code').order('code', { ascending: false }).limit(1);
if (lastErr) { console.error(lastErr); process.exit(1); }
let n = last?.length ? parseInt(last[0].code.replace('ACASE-', ''), 10) : 0;

const out = [['code', 'email', 'password', 'status']];

for (const r of rows) {
  const email = (r.email || '').toLowerCase();
  if (!email) continue;

  const { data: exists } = await sb.from('teams').select('id').eq('login_email', email).maybeSingle();
  if (exists) { out.push(['', email, '', 'SKIP: sudah ada']); continue; }

  const password = genPassword();
  const { data: created, error: uErr } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { must_change_password: true },
  });
  if (uErr) { out.push(['', email, '', `ERROR: ${uErr.message}`]); continue; }

  n += 1;
  const code = `ACASE-${String(n).padStart(3, '0')}`;
  const { error: tErr } = await sb.from('teams').insert({
    user_id: created.user.id,
    code,
    login_email: email,
    category: r.category === 'early_bird' ? 'early_bird' : 'regular',
    payment_verified: String(r.payment_verified).toLowerCase() === 'true',
  });
  if (tErr) {
    await sb.auth.admin.deleteUser(created.user.id);   // rollback
    n -= 1;
    out.push(['', email, '', `ERROR: ${tErr.message}`]);
    continue;
  }
  out.push([code, email, password, 'OK']);
  console.log(`${code}  ${email}`);
}

const stamp = new Date().toISOString().slice(0, 10);
const outFile = `credentials-${stamp}.csv`;
writeFileSync(outFile, out.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'));
console.log(`\nSelesai. Kredensial: ${outFile}  (JANGAN commit / bagikan sembarangan)`);
```

### `scripts/reset-password.mjs`

```js
// Pemakaian: node reset-password.mjs email@tim.com
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const email = (process.argv[2] || '').toLowerCase();
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !email) {
  console.error('Set env dan berikan email'); process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const pw = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const { data: team, error } = await sb.from('teams').select('user_id, code').eq('login_email', email).maybeSingle();
if (error || !team) { console.error('Tim tidak ditemukan'); process.exit(1); }
const { error: e2 } = await sb.auth.admin.updateUserById(team.user_id, {
  password: pw, user_metadata: { must_change_password: true },
});
if (e2) { console.error(e2.message); process.exit(1); }
console.log(`${team.code}  ${email}  password baru: ${pw}`);
```

## 10. Kontrak API untuk frontend

Frontend hanya memakai `anon key` + sesi login pengguna. Berikut seluruh pemanggilan yang diperbolehkan (agent **tidak boleh** menambah yang lain tanpa alasan).

| Kebutuhan | Pemanggilan |
|---|---|
| Waktu server (sebelum login) | `rpc('server_now')` |
| Apakah admin | `rpc('is_admin')` |
| Status lengkap tim | `rpc('my_status')` |
| Baca biodata | `from('team_members').select('*').order('member_no')` |
| Simpan biodata | `rpc('save_team_biodata', { p_name, p_team_size, p_members, p_consent })` |
| Daftar materi case | `from('case_materials').select('*').order('sort_order')` |
| Unduh materi | `storage.from('case-files').createSignedUrl(path, 60)` |
| Upload submission | `storage.from('submissions').upload('{teamId}/{stage}/main.pdf', file, { upsert: true, contentType: 'application/pdf' })` lalu `from('submissions').upsert({...}, { onConflict: 'team_id,stage,slot' })` |
| Baca submission sendiri | `from('submissions').select('*').eq('stage', ...)` |
| Pengumuman | `from('announcements').select('*').order('pinned',{ascending:false}).order('published_at',{ascending:false})` |
| Daftar finalis publik | `from('public_finalists').select('*')` |
| Jadwal | `from('stages').select('*')` |
| Bukti mahasiswa | upload ke `student-proofs/{teamId}/proof.pdf` lalu `rpc('set_student_proof', { p_path })` |
| Ganti password | `auth.updateUser({ password })` |

Untuk admin: baca/tulis langsung ke tabel sesuai policy admin (lihat `04-admin-panel.md`).

## 11. Verifikasi setelah migrasi

Jalankan di SQL Editor dan pastikan hasilnya sesuai.

```sql
-- Semua tabel public harus RLS = true
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;

-- Jadwal ter-seed
select key, opens_at at time zone 'Asia/Jakarta' as opens_wib,
       closes_at at time zone 'Asia/Jakarta' as closes_wib from public.stages order by opens_at;

-- Bucket private
select id, public, file_size_limit from storage.buckets;

-- Policy terdaftar
select tablename, policyname, cmd, roles from pg_policies
where schemaname in ('public','storage') order by 1, 2;
```

Lalu jalankan matriks uji di `05-security-and-testing.md` sebelum membuat akun peserta sungguhan.
