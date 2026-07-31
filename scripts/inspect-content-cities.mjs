// Run: node scripts/inspect-content-cities.mjs
// READ-ONLY diagnostic: reports whether a `site_content` override exists in the
// settings table (which would mask DEFAULT_CONTENT in lib/content.ts), and lists
// guests whose stored city is not a known Indian city (candidates for the wrong-
// city bug). Makes no writes.

import { readFileSync } from "fs";

const env = {};
try {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=][^=]*)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("Could not read .env.local — run from project root.");
  process.exit(1);
}

const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

const HEADERS = { apikey: key, Authorization: `Bearer ${key}` };

// Same curated Indian city list as lib/cities.ts INDIA_CITIES
const INDIAN_CITIES = new Set([
  "Chennai","Mumbai","Delhi","Bangalore","Hyderabad","Kolkata","Pune","Ahmedabad",
  "Jaipur","Surat","Lucknow","Kanpur","Nagpur","Indore","Thane","Bhopal",
  "Visakhapatnam","Patna","Vadodara","Ghaziabad","Ludhiana","Agra","Nashik",
  "Faridabad","Meerut","Rajkot","Varanasi","Srinagar","Aurangabad","Dhanbad",
  "Amritsar","Allahabad","Howrah","Ranchi","Gwalior","Jabalpur","Coimbatore",
  "Vijayawada","Jodhpur","Madurai","Raipur","Kota","Chandigarh","Guwahati",
  "Solapur","Mysore","Tiruchirappalli","Bareilly","Aligarh","Moradabad",
  "Jalandhar","Bhubaneswar","Salem","Warangal","Guntur","Noida","Kochi",
  "Nellore","Dehradun","Jamshedpur","Cuttack","Mangalore","Erode","Belgaum",
  "Tirunelveli","Gaya","Jalgaon","Udaipur","Siliguri","Jammu","Ujjain",
  "Nanded","Kolhapur","Ajmer","Hubli","Dharwad","Vellore","Tiruppur",
  "Tirupati","Thrissur","Kozhikode","Thiruvananthapuram","Kannur","Kollam",
  "Durgapur","Asansol","Rourkela","Bikaner","Bhilai","Jhansi","Navi Mumbai",
  "Secunderabad","Pimpri","Chinchwad","New Delhi",
].map((c) => c.toLowerCase()));

// 1. Check site_content override
const scRes = await fetch(`${url}/rest/v1/settings?key=eq.site_content&select=key,value,updated_at`, { headers: HEADERS });
const scRows = await scRes.json();
if (Array.isArray(scRows) && scRows.length > 0) {
  const raw = scRows[0].value ?? "null";
  console.log("⚠️  site_content OVERRIDE EXISTS (updated " + (scRows[0].updated_at ?? "?") + ")");
  try {
    const parsed = JSON.parse(raw);
    console.log("    hosts_bride      :", parsed?.invitation?.hosts_bride);
    const fam = parsed?.families?.sharon;
    console.log("    families.sharon  :", JSON.stringify(fam));
    const bio = parsed?.sharon?.bio ?? "";
    console.log("    sharon.bio (start):", bio.slice(0, 220).replace(/\s+/g, " ") + (bio.length > 220 ? "…" : ""));
  } catch (e) {
    console.log("    (site_content is not valid JSON —", e.message, ")");
  }
} else {
  console.log("✅ No site_content override — DEFAULT_CONTENT in lib/content.ts is used live.");
}

// 2. Guests with non-Indian cities
console.log("\n--- Guests whose stored city is NOT a known Indian city ---");
const gRes = await fetch(`${url}/rest/v1/guests?select=id,name,city,mobile,email,created_at&order=created_at.desc`, { headers: HEADERS });
const guests = await gRes.json();
if (!Array.isArray(guests)) {
  console.error("Could not load guests:", JSON.stringify(guests));
  process.exit(1);
}
const bad = guests.filter((g) => !INDIAN_CITIES.has(String(g.city ?? "").trim().toLowerCase()));
console.log(`Total guests: ${guests.length} | with non-Indian/missing city: ${bad.length}`);
for (const g of bad) {
  const fps = await (await fetch(`${url}/rest/v1/device_fingerprints?guest_id=eq.${g.id}&select=id`, { headers: HEADERS })).json();
  const fpCount = Array.isArray(fps) ? fps.length : 0;
  console.log(`  - ${g.name} | city="${g.city}" | email=${g.email ?? "-"} | mobile=${g.mobile ?? "-"} | device fingerprints: ${fpCount}`);
}
