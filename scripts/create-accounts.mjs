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
