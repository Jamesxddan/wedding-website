// Run: node scripts/clear-wrong-city-sessions.mjs [--commit] [--city "Hyder"]
//
// Clears device sessions (device_fingerprints) for guests whose stored city is
// NOT a known Indian city — the victims of the city autocomplete bug that
// silently accepted partial prefixes like "Hyder". Clearing the fingerprint
// makes the guest look brand new, so on their next visit they re-register with
// the corrected form (which also updates their stored city via mobile/email).
//
// Default is a DRY RUN. Pass --commit to actually delete fingerprints.
// Optional --city "X" restricts the run to a specific stored city value.

import { loadEnv, supabaseREST } from "./lib/supabase-util.mjs";

const { url, key } = loadEnv();
const db = supabaseREST({ url, key });

const COMMIT = process.argv.includes("--commit");
const cityArg = process.argv.indexOf("--city");
const ONLY_CITY = cityArg > -1 && process.argv[cityArg + 1];

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

const guests = await db.get(`/guests?select=id,name,city&order=created_at.desc`);

const targets = guests.filter((g) => {
  const city = String(g.city ?? "").trim().toLowerCase();
  if (ONLY_CITY) return city === String(ONLY_CITY).trim().toLowerCase();
  return !INDIAN_CITIES.has(city);
});

console.log(`Guests scanned: ${guests.length} | targets: ${targets.length}` + (ONLY_CITY ? ` (city="${ONLY_CITY}")` : ""));
for (const g of targets) {
  const fps = await db.get(`/device_fingerprints?guest_id=eq.${g.id}&select=id,created_at,last_seen_at`);
  console.log(`  - ${g.name} | city="${g.city}" | ${fps.length} device fingerprint(s) to clear`);
}

if (targets.length === 0) {
  console.log("Nothing to do.");
  await db.close();
  process.exit(0);
}

if (!COMMIT) {
  console.log("\n(dry run — pass --commit to delete the fingerprints above)");
  await db.close();
  process.exit(0);
}

let cleared = 0;
for (const g of targets) {
  const res = await db.del(`/device_fingerprints?guest_id=eq.${g.id}`);
  cleared += Array.isArray(res) ? res.length : 0;
}
console.log(`\n✅ Cleared sessions for ${targets.length} guest(s) — ${cleared} device fingerprint(s) deleted.`);
console.log("   Guests will now re-register on the corrected form.");
await db.close();
