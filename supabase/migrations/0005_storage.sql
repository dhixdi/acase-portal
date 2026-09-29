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
