-- ============================================================
-- 0010_admin_deletes.sql
-- ============================================================

create or replace function public.admin_delete_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select user_id into v_user_id from public.teams where id = p_team_id;
  
  if found then
    -- Hapus dari auth.users (ini akan otomatis CASCADE ke public.teams, team_members, dll)
    delete from auth.users where id = v_user_id;
  end if;
end;
$$;

revoke all on function public.admin_delete_team(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_team(uuid) to authenticated;
