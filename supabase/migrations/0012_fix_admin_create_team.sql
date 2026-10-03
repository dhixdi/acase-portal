-- ============================================================
-- 0012_fix_admin_create_team.sql
-- ============================================================
create extension if not exists pgcrypto;

create or replace function public.admin_create_team()
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_next_num int;
  v_username text;
  v_email text;
  v_password text;
  v_user_id uuid := gen_random_uuid();
  v_encrypted_password text;
begin
  if not (select public.is_admin()) then
    raise exception 'Akses ditolak';
  end if;

  -- Cari angka terakhir dari ACASE-XXX (minimum 10 agar mulai dari 11)
  select greatest(coalesce(max(nullif(regexp_replace(code, '^ACASE-', ''), '')::int), 10), 10)
    into v_next_num
    from public.teams
   where code like 'ACASE-%';
  
  v_next_num := v_next_num + 1;
  v_username := 'ACASE-' || lpad(v_next_num::text, 3, '0');
  v_email := lower(v_username) || '@asiq.ugm.ac.id';
  
  -- Generate random password 8 chars (hex lowercase seperti format lama)
  v_password := encode(extensions.gen_random_bytes(4), 'hex');
  
  -- Encrypt password for GoTrue
  v_encrypted_password := extensions.crypt(v_password, extensions.gen_salt('bf'));

  -- Insert auth.users (pastikan semua kolom token yang berpotensi NULL diisi string kosong '')
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token,
    is_super_admin, is_sso_user
  ) values (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email, v_encrypted_password,
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(),
    '', '', '', '', '', '', '', '', false, false
  );

  -- Insert auth.identities (pastikan identity_data lengkap)
  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    v_user_id::text, v_user_id, 
    jsonb_build_object(
      'sub', v_user_id::text, 
      'email', v_email, 
      'email_verified', true, 
      'phone_verified', false
    ), 
    'email', now(), now(), now()
  );

  -- Insert public.teams
  insert into public.teams (user_id, code, login_email)
  values (v_user_id, v_username, v_email);

  return json_build_object(
    'username', v_username,
    'password', v_password
  );
end;
$$;

revoke all on function public.admin_create_team() from public;
grant execute on function public.admin_create_team() to authenticated;
