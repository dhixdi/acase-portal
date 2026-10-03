-- ============================================================
-- 0013_repair_broken_accounts.sql
-- ============================================================
-- Script ini akan memperbaiki akun ACASE-036 hingga ACASE-045 (dan seterusnya)
-- yang gagal login karena kolom token bernilai NULL dan identity_data tidak lengkap.

begin;

-- 1. Perbaiki kolom token NULL di auth.users menjadi string kosong ''
update auth.users u set
  confirmation_token         = coalesce(u.confirmation_token, ''),
  recovery_token             = coalesce(u.recovery_token, ''),
  email_change               = coalesce(u.email_change, ''),
  email_change_token_new     = coalesce(u.email_change_token_new, ''),
  email_change_token_current = coalesce(u.email_change_token_current, ''),
  phone_change               = coalesce(u.phone_change, ''),
  phone_change_token         = coalesce(u.phone_change_token, ''),
  reauthentication_token     = coalesce(u.reauthentication_token, ''),
  is_super_admin             = coalesce(u.is_super_admin, false),
  is_sso_user                = coalesce(u.is_sso_user, false)
from public.teams t
where t.user_id = u.id
  and t.code ~ '^ACASE-[0-9]+$'
  and (u.confirmation_token is null or u.recovery_token is null);

-- 2. Perbaiki auth.identities untuk melengkapi email_verified
update auth.identities i set
  identity_data = jsonb_build_object(
      'sub', i.user_id::text, 
      'email', u.email, 
      'email_verified', true, 
      'phone_verified', false
  ),
  last_sign_in_at = coalesce(i.last_sign_in_at, now())
from auth.users u
join public.teams t on t.user_id = u.id
where i.user_id = u.id
  and t.code ~ '^ACASE-[0-9]+$'
  and not (i.identity_data ? 'email_verified');

commit;
