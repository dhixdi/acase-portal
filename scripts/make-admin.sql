-- Jalankan di SQL Editor Supabase (peran postgres).
-- Ganti email dengan email admin yang sudah dibuat di Authentication > Users.

insert into public.admins (user_id)
select id from auth.users where email = 'GANTI_DENGAN_EMAIL_ADMIN'
on conflict do nothing;
