-- Jalankan di SQL Editor Supabase (peran postgres).
-- Ganti email dengan email admin yang sudah dibuat di Authentication > Users.

insert into public.admins (user_id)
select id from auth.users where email = 'dhifendi@gmail.com'
on conflict do nothing;
