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
