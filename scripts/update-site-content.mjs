// Run: node scripts/update-site-content.mjs [--commit]
//
// Updates the live `site_content` override (settings table) so the corrected
// Sharon bio + bride-parent spelling take effect on the deployed site, which
// reads site_content over DEFAULT_CONTENT in lib/content.ts.
//
// Default is a DRY RUN that prints what would change. Pass --commit to write.

import { loadEnv, supabaseREST } from "./lib/supabase-util.mjs";

const { url, key } = loadEnv();
const db = supabaseREST({ url, key });

const COMMIT = process.argv.includes("--commit");

// Same corrected text as lib/content.ts
const HOSTS_BRIDE = "Mr. Yesuratnam & Mrs. Rizmasusi";
const SHARON_BIO =
  "Born in 1999 and raised in a loving Christian family, Sharon grew up with her parents, Mr. Yesuratnam and Mrs. Rizmasusi, and her younger sister in a home rooted in faith, kindness, prayer, and respect. Her grandparents, Mr. Jacob and Mrs. Ruth, lovingly led the family to the Laymen's Evangelical Fellowship (LEF), where her spiritual foundation was nurtured from an early age. She holds a B.Tech degree and currently serves as an AI Evaluation Specialist with a leading multinational company in Hyderabad. She values faith, family, and meaningful relationships, and looks forward to building a Christ-centered life filled with love, purpose, and God's grace. It was through their shared church community that, by His sovereign will, God wove these two families together.";
const SHARON_FAMILY = [
  { name: "Mr. Yesuratnam", role: "Father of the Bride" },
  { name: "Mrs. Rizmasusi", role: "Mother of the Bride" },
  { name: "Shiny Singapogu", role: "Sister of the Bride" },
];

const OVERRIDES = {
  invitation: { hosts_bride: HOSTS_BRIDE },
  families: { sharon: SHARON_FAMILY },
  sharon: { bio: SHARON_BIO },
};

function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...(base ?? {}) };
  for (const [k, v] of Object.entries(override ?? {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Load current override
const rows = await db.get(`/settings?key=eq.site_content&select=key,value`);
if (!Array.isArray(rows) || rows.length === 0) {
  console.log("No site_content row found — nothing to update.");
  process.exit(0);
}

let current = {};
try {
  current = JSON.parse(rows[0].value ?? "{}");
} catch {
  console.log("Existing site_content is not valid JSON — will replace from defaults.");
}

const next = deepMerge(current, OVERRIDES);

const summarize = (o) => ({
  hosts_bride: o?.invitation?.hosts_bride,
  sharon_bio_start: (o?.sharon?.bio ?? "").slice(0, 90).replace(/\s+/g, " "),
  sharon_family: o?.families?.sharon,
});

console.log("--- BEFORE ---");
console.log(JSON.stringify(summarize(current), null, 2));
console.log("--- AFTER ---");
console.log(JSON.stringify(summarize(next), null, 2));

if (!COMMIT) {
  console.log("\n(dry run — pass --commit to write to Supabase)");
  await db.close();
  process.exit(0);
}

const res = await db.patch(`/settings?key=eq.site_content`, {
  value: JSON.stringify(next),
  updated_at: new Date().toISOString(),
});
console.log("\n✅ site_content updated. (PATCH response: " + JSON.stringify(res).slice(0, 200) + ")");
await db.close();
