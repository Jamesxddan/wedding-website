// Builds the compact chatbot knowledge base from the brainstorm output.
//
// Input : data/brainstorm/*.json   (one file per category, produced by the
//         chatbot-question-bank workflow: 12 domain agents + 2 gap critics)
// Output: data/chatbot-knowledge.json          (compact, imported at runtime)
//         docs/chatbot-question-bank.md        (human-readable full question bank)
//
// The brainstorm directory is removed after a successful build.
//
// Usage: node scripts/build-chatbot-kb.mjs  (from repo root)

import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BRAINSTORM_DIR = join(ROOT, "data", "brainstorm");
const KB_PATH = join(ROOT, "data", "chatbot-knowledge.json");
const DOC_PATH = join(ROOT, "docs", "chatbot-question-bank.md");

const CAT_ORDER = [
  "logistics", "venue", "streaming", "couple", "site", "registration",
  "gallery", "comments", "navigation", "music", "troubleshooting",
  "boundaries", "gaps", "gaps-edge",
];

const TITLES = {
  logistics: "Wedding Logistics & Schedule",
  venue: "Venues & Directions",
  streaming: "Watching Live (Streaming)",
  couple: "The Couple — James & Sharon",
  site: "About This Website",
  registration: "Registration & Guest Access",
  gallery: "Photo Gallery",
  comments: "Wall of Love Comments",
  navigation: "Site Navigation & Guest Journey",
  music: "Background Music",
  troubleshooting: "Troubleshooting",
  boundaries: "What the Bot Declines & Etiquette",
  gaps: "Extra Topics (Completeness Pass)",
  "gaps-edge": "Phrasings, Typos & Safety Edge Cases",
};

// Hand-authored, high-priority entries. These are guaranteed to be in the
// knowledge base even if the brainstorm misses them, and they win dedup.
const CORE = [
  {
    id: "site-creator", cat: "site",
    q: "Who created this website?",
    a: "The groom himself — James Daniel built this wedding website as a gift for Sharon, coding every page himself. 💛 He works in tech as an Associate Application Support Analyst at Globus Medical.",
    phrasings: [
      "who made this website", "who built this site", "who created this site",
      "who developed this wedding website", "who designed this website",
      "who coded this site", "who made this", "is this site made by the groom",
      "did james make this website", "who is the developer of this site",
      "who is the webmaster here", "who's behind this website",
    ],
    kws: ["creator", "created", "built", "made", "developer", "who built", "who made", "webmaster", "made this"],
  },
  {
    id: "groom-work", cat: "couple",
    q: "Where does the groom work?",
    a: "James Daniel works as an Associate Application Support Analyst at Globus Medical, an international medical device company.",
    phrasings: [
      "where is james working", "what does james do for work", "what is james job",
      "where does james work", "what does the groom do", "what is the groom profession",
      "james employer", "which company does james work for", "what does james daniel do",
      "is james in IT", "what is james career",
    ],
    kws: ["groom", "james", "work", "job", "employer", "company", "globus", "profession", "career"],
  },
  {
    id: "bride-work", cat: "couple",
    q: "Where does the bride work?",
    a: "Sharon works as an AI Evaluation Specialist at Uber and is based in Hyderabad.",
    phrasings: [
      "where is sharon working", "what does sharon do for work", "what is sharon job",
      "where does sharon work", "what does the bride do", "what is the bride profession",
      "sharon employer", "which company does sharon work for", "what does sharon do",
      "is sharon in tech", "what is sharon career",
    ],
    kws: ["bride", "sharon", "work", "job", "employer", "company", "uber", "hyderabad", "profession", "career"],
  },
  {
    id: "wedding-date", cat: "logistics",
    q: "When is the wedding?",
    a: "The wedding is on Thursday, October 8, 2026, in Chennai, India. The ceremony is at 4:30 PM and the reception at 7:00 PM.",
    phrasings: [
      "what date is the wedding", "what day is the wedding", "when is the big day",
      "what is the wedding date", "when is james and sharon wedding",
      "what day is it happening", "when is the marriage", "date of the wedding",
      "when are they getting married",
    ],
    kws: ["when", "date", "wedding", "day", "marriage", "getting married", "october"],
  },
  {
    id: "watch-live", cat: "streaming",
    q: "I can't attend — can I watch online?",
    a: "Yes! Both the ceremony and reception will be streamed live on this site on October 8th. Just come back on the day and look for the live stream section.",
    phrasings: [
      "can I watch the wedding online", "how to watch live", "is there a live stream",
      "can't attend, can I watch", "watch from home", "will it be streamed",
      "is the wedding on youtube", "can I watch remotely", "livestream link",
      "how can I watch from abroad", "can my relatives watch online",
    ],
    kws: ["watch", "live", "stream", "online", "youtube", "remotely", "cant attend", "livestream"],
  },
  {
    id: "gift-registry", cat: "boundaries",
    q: "Where is the gift registry?",
    a: "The couple hasn't shared a gift registry yet — they'll share details closer to the day. Your presence and blessings are the greatest gift! 💐",
    phrasings: [
      "what gift should I bring", "where do I send a gift", "is there a wedding registry",
      "gift ideas", "what to gift the couple", "can I send money", "gift list",
      "what presents do they want", "registered at which store",
    ],
    kws: ["gift", "registry", "present", "present", "money", "presents"],
  },
  {
    id: "music-ios", cat: "music",
    q: "Why is there no music on my iPhone?",
    a: "Apple requires a tap to start audio. Tap the music button or your name/register button once and the background music will begin.",
    phrasings: [
      "no sound on iphone", "music not playing on ios", "can't hear music on my phone",
      "why is it silent", "music won't start", "sound not working on safari",
      "how do I start the music", "audio not playing",
    ],
    kws: ["music", "sound", "audio", "iphone", "ios", "silent", "safari", "playing"],
  },
];

// Ground-truth fact sheet — used to enrich the LLM system prompt so the
// chatbot knows the same facts the brainstorm was grounded in.
const FACTS = [
  { k: "Wedding date", v: "Thursday, October 8, 2026 — Chennai, India" },
  { k: "Couple", v: "James Daniel (groom) & Sharon (bride)" },
  { k: "Ceremony", v: "Holy Matrimony — St Andrew's Kirk, Poonamallee High Rd, Vepery, Chennai 600 007, India · 4:30 PM" },
  { k: "Reception", v: "BKN Auditorium, Ritherdon Road, Vepery, Chennai, India · 7:00 PM" },
  { k: "Live streams", v: "Ceremony: https://www.youtube.com/watch?v=25ffO_JAjRo · Reception: https://www.youtube.com/watch?v=qYmSQd4ZnuA (both streamed on the site on Oct 8)" },
  { k: "Groom", v: "James Daniel — born Oct 16, 1997; twin brother John Jebasingh; from Chennai; Anitha Methodist School; Laymen's Evangelical Fellowship; B.P.T., MGR Medical University; Associate Application Support Analyst at Globus Medical" },
  { k: "Bride", v: "Sharon — born 1999; from Guntur, Andhra Pradesh; works in Hyderabad; B.Tech (Electronics & Communication Engineering); AI Evaluation Specialist at Uber; parents Mr. Yesuratnam & Mrs. Rizmasusi; sister Shiny Singapogu; grandparents Mr. Jacob & Mrs. Ruth" },
  { k: "How they met", v: "Through their shared church community — the Laymen's Evangelical Fellowship (LEF)" },
  { k: "Groom's family", v: "Father Mr. Joseph Rubin Washington · Mother Mrs. Sophia Joseph · Brother John Jebasingh" },
  { k: "Bride's family", v: "Father Mr. Yesuratnam · Mother Mrs. Rizmasusi · Sister Shiny Singapogu" },
  { k: "Website", v: "Created by the groom, James Daniel. Built with Next.js, React, Tailwind CSS, TypeScript, Supabase, Google Drive, Three.js and GSAP; deployed on Vercel; live at jameswedssharon.site" },
  { k: "Gift registry", v: "Not shared publicly yet — the couple will share details closer to the day" },
  { k: "Guest journey", v: "Register name/city/contact → open invitation card → countdown & slideshow → about, families, venues, itinerary → gallery → Wall of Love → music toggle → FAQ chat" },
];

// Shared with lib/chatbot-knowledge.ts — must stay identical so the runtime
// tokenizer and the build-time dedup keys agree on apostrophes/contractions.
const CONTRACTIONS = {
  "what's": "what is", "who's": "who is", "where's": "where is", "when's": "when is",
  "how's": "how is", "why's": "why is", "that's": "that is", "there's": "there is",
  "here's": "here is", "it's": "it is", "he's": "he is", "she's": "she is",
  "we're": "we are", "you're": "you are", "they're": "they are",
  "i'm": "i am", "let's": "let us",
  "can't": "cannot", "won't": "will not", "don't": "do not", "isn't": "is not",
  "aren't": "are not", "doesn't": "does not", "didn't": "did not",
  "wouldn't": "would not", "shouldn't": "should not", "couldn't": "could not",
  "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
  "i've": "i have", "we've": "we have", "you've": "you have", "they've": "they have",
  "i'll": "i will", "we'll": "we will", "you'll": "you will", "they'll": "they will",
  "i'd": "i would", "you'd": "you would", "he'd": "he would", "she'd": "she would",
  "we'd": "we would", "they'd": "they would",
};
const norm = (s) => {
  let t = (s || "").toLowerCase();
  t = t.replace(/[a-z']+/g, (w) => CONTRACTIONS[w] ?? w);
  t = t.replace(/'(s)?\b/g, " ");
  return t.replace(/[^a-z0-9]+/g, " ").trim();
};

// Entries that must NEVER be answered by the instant fast path. These are
// jailbreak / admin-credential / other-guests'-data probes — routing them to
// the LLM keeps the OFF_TOPIC sentinel + breach alert behaviour intact (an
// instant decline would silently bypass the admin alert).
// Only STRONG abuse tokens are used — common words like "password", "login"
// or "secret" also appear in harmless registration/troubleshooting entries.
const DECLINE_TOKENS = [
  "admin", "credentials", "passcode", "api key", "database", "jailbreak",
  "roleplay", "pretend", "system prompt", "reveal", "phone numbers",
  "rsvp status", "guest list", "confidential",
];
const isDecline = (e) =>
  DECLINE_TOKENS.some((t) => `${e.q} ${e.kws.join(" ")}`.toLowerCase().includes(t));

const seenIds = new Set();
const nextId = (id) => {
  let base = id || "entry";
  let out = base;
  let n = 2;
  while (seenIds.has(out)) out = `${base}-${n++}`;
  seenIds.add(out);
  return out;
};

// Read brainstorm files.
const merged = new Map(); // norm(q) -> entry
const pushEntry = (raw, cat) => {
  const q = typeof raw.q === "string" ? raw.q.trim() : "";
  const a = typeof raw.a === "string" ? raw.a.trim() : "";
  if (!q || !a) return;
  const key = norm(q);
  if (merged.has(key)) return; // first wins (CORE is inserted first)
  const entry = {
    id: nextId(typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : norm(q).replace(/ /g, "-") || "entry"),
    cat: cat || "general",
    q,
    a,
    phrasings: Array.isArray(raw.phrasings) ? raw.phrasings.map(String).filter(Boolean).slice(0, 20) : [],
    kws: Array.isArray(raw.kws) ? raw.kws.map(String).map((k) => k.toLowerCase()).filter(Boolean).slice(0, 10) : [],
  };
  const decline = isDecline(entry);
  if (decline) entry.decline = true;
  merged.set(key, entry);
};

for (const e of CORE) pushEntry(e, e.cat);

if (existsSync(BRAINSTORM_DIR)) {
  const files = readdirSync(BRAINSTORM_DIR).filter((f) => f.endsWith(".json")).sort();
  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(BRAINSTORM_DIR, f), "utf8"));
      const cat = data.category || f.replace(".json", "");
      for (const e of data.intents || []) pushEntry(e, cat);
    } catch (err) {
      console.error(`  ! skipped ${f}: ${err.message}`);
    }
  }
} else if (existsSync(KB_PATH)) {
  // No brainstorm to build from (it is deleted after a successful build), so
  // preserve the existing knowledge base and overlay any new CORE entries on
  // top — CORE already won dedup above. Re-running the script this way is
  // therefore safe: adding a CORE entry and re-running updates the KB instead
  // of collapsing it to just the hand-authored entries.
  try {
    const existing = JSON.parse(readFileSync(KB_PATH, "utf8"));
    for (const e of existing.faq || []) pushEntry(e, e.cat);
  } catch (err) {
    console.error(`  ! could not preserve existing KB: ${err.message}`);
  }
}

// Build ordered FAQ list.
const faq = [];
for (const cat of CAT_ORDER) {
  for (const e of merged.values()) if (e.cat === cat) faq.push(e);
}
for (const e of merged.values()) if (!CAT_ORDER.includes(e.cat)) faq.push(e); // stragglers

const totalPhrasings = faq.reduce((n, e) => n + e.phrasings.length, 0);

const kb = {
  meta: {
    site: "jameswedssharon.site",
    couple: "James Daniel & Sharon",
    wedding_date: "October 8, 2026",
    version: 1,
    intentCount: faq.length,
    phrasingCount: totalPhrasings,
  },
  facts: FACTS,
  faq,
};

writeFileSync(KB_PATH, JSON.stringify(kb));
const kbKb = (Buffer.byteLength(JSON.stringify(kb)) / 1024).toFixed(1);

// Human-readable question bank.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const lines = [];
lines.push("# Chatbot Question Bank — James & Sharon Wedding Site");
lines.push("");
lines.push(`Full brainstorm of every question the site's FAQ chatbot can answer. Grouped by topic. Each entry shows the canonical question, the answer the bot gives, and the alternative phrasings it recognises.`);
lines.push("");
lines.push(`**Coverage:** ${faq.length} question intents · ${totalPhrasings} alternate phrasings · stored compactly in \`data/chatbot-knowledge.json\` (${kbKb} KB).`);
lines.push("");
lines.push("## Contents");
for (const cat of CAT_ORDER) {
  const n = faq.filter((e) => e.cat === cat).length;
  if (n) lines.push(`- [${TITLES[cat]}](#${slug(TITLES[cat])}) — ${n} questions`);
}
lines.push("");
for (const cat of CAT_ORDER) {
  const items = faq.filter((e) => e.cat === cat);
  if (!items.length) continue;
  lines.push(`## ${TITLES[cat]}`);
  lines.push("");
  for (const e of items) {
    lines.push(`### ${e.q}`);
    lines.push("");
    lines.push(`**Answer:** ${e.a}`);
    if (e.phrasings.length) lines.push("");
    lines.push(`*Also asked as:* ${e.phrasings.join(" · ")}`);
    lines.push("");
  }
}
writeFileSync(DOC_PATH, lines.join("\n"));

// Clean up the transient brainstorm files.
if (existsSync(BRAINSTORM_DIR)) rmSync(BRAINSTORM_DIR, { recursive: true, force: true });

console.log(`✔ ${faq.length} intents, ${totalPhrasings} phrasings`);
console.log(`✔ ${KB_PATH} (${kbKb} KB)`);
console.log(`✔ ${DOC_PATH}`);
