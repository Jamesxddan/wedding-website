// Run: node scripts/update-sharon-faith.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env.local manually
const env = {};
try {
  const raw = readFileSync('.env.local', 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=][^=]*)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* ignore */ }

const supabaseUrl = env.SUPABASE_URL || process.env.SUPABASE_URL || 'https://sadikezxiwyntwutntnp.supabase.co';
const supabaseKey = env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_KEY');
  process.exit(1);
}
const s = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

(async () => {
  const { data, error } = await s.from('settings').select('value').eq('key', 'site_content').single();
  if (error) { console.error('Fetch error:', error); process.exit(1); }

  let c = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;

  if (c.sharon && c.sharon.facts) {
    const faithFact = c.sharon.facts.find(f => f.label === 'Faith');
    if (faithFact) {
      faithFact.value = "Christian — Laymen's Evangelical Fellowship";
    }
  }

  const { error: upsertError } = await s.from('settings').upsert(
    { key: 'site_content', value: JSON.stringify(c), updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );

  if (upsertError) { console.error('Update error:', upsertError); process.exit(1); }
  console.log('✅ Updated Sharon faith');
})();
