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
