// Run: node scripts/seed-super-admin.mjs
// Seeds jdj123.1997@gmail.com as super admin using ADMIN_PASSWORD from .env.local

import { scryptSync, randomBytes } from "crypto";
import { readFileSync } from "fs";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Parse .env.local manually (no dotenv dependency needed)
const env = {};
try {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=][^=]*)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("Could not read .env.local — run this from the project root.");
  process.exit(1);
}

const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_KEY;
const password = env.ADMIN_PASSWORD;

if (!url || !key || !password) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_KEY, or ADMIN_PASSWORD in .env.local");
  process.exit(1);
}

const pass_hash = hashPassword(password);

const res = await fetch(`${url}/rest/v1/admins`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify({
    email: "jdj123.1997@gmail.com",
    pass_hash,
    is_super: true,
    added_by: null,
  }),
});

const body = await res.text();
if (res.ok || res.status === 201) {
  console.log("✅ Super admin seeded: jdj123.1997@gmail.com");
  console.log("   Login at /admin with your existing ADMIN_PASSWORD");
} else {
  console.error("❌ Failed:", res.status, body);
}
