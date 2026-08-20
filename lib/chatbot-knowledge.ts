import "server-only";
import kb from "@/data/chatbot-knowledge.json";

export interface KbEntry {
  id: string;
  cat: string;
  q: string;
  a: string;
  phrasings: string[];
  kws: string[];
  /** True for jailbreak / admin-credential / other-guests'-data probes.
   *  These must NOT be answered by the instant fast path — they go to the
   *  LLM so the OFF_TOPIC sentinel + breach alert still fire. */
  decline?: boolean;
}

export interface KbFact {
  k: string;
  v: string;
}

const FAQ = (kb.faq ?? []) as KbEntry[];
const FACTS = (kb.facts ?? []) as KbFact[];

/** Fact sheet injected into the LLM system prompt so the chatbot knows the
 *  same ground truth the question bank was built from. */
export function buildFactSheet(): string {
  return FACTS.map((f) => `- ${f.k}: ${f.v}`).join("\n");
}

// ---- Instant keyword answering (fast path, no LLM call) ----

const STOP = new Set([
  "the", "a", "an", "is", "are", "am", "be", "was", "were", "been",
  "do", "does", "did", "done", "can", "could", "shall", "should", "would", "will", "may", "might",
  "what", "how", "where", "when", "why", "who", "whom", "which",
  "i", "me", "my", "mine", "we", "our", "us", "you", "your", "yours", "they", "their", "them", "he", "she", "it", "its",
  "to", "of", "for", "on", "in", "at", "by", "with", "from", "about", "into", "over", "under",
  "and", "or", "but", "so", "if", "not", "no", "then", "than",
  "please", "tell", "say", "know", "want", "need", "let", "there", "here",
  "this", "that", "these", "those", "some", "any", "one", "get", "got", "have", "has",
]);

// Common contractions expanded so apostrophe fragments ("s", "re", "ve")
// don't leak into the token set — "what's" -> "what is", "bride's" -> "bride".
const CONTRACTIONS: Record<string, string> = {
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

const norm = (s: string): string => {
  let t = s.toLowerCase();
  // Expand contractions first so "what's" -> "what is" instead of "what s".
  t = t.replace(/[a-z']+/g, (w) => CONTRACTIONS[w] ?? w);
  // Then strip possessives: "bride's" -> "bride", "guests'" -> "guests".
  t = t.replace(/'(s)?\b/g, " ");
  return t.replace(/[^a-z0-9]+/g, " ").trim();
};

const tokens = (s: string): string[] =>
  norm(s).split(" ").filter(Boolean).filter((t) => !STOP.has(t));

// Precompute each entry's token set once at module load (server-side only,
// so this never ships to the browser).
const INDEX: { e: KbEntry; toks: Set<string> }[] = FAQ.map((e) => ({
  e,
  toks: new Set([
    ...tokens(e.q),
    ...e.kws,
    ...e.phrasings.flatMap((p) => tokens(p)),
  ]),
}));

// Document frequency of every token — how many entries contain it. Rare
// tokens (e.g. "parking", "registry") are high-signal and alone can justify
// an instant answer; common tokens ("wedding", "site") are not.
const DF = new Map<string, number>();
for (const { toks } of INDEX) {
  for (const t of toks) DF.set(t, (DF.get(t) ?? 0) + 1);
}
const isRare = (t: string) => (DF.get(t) ?? 99) <= 2;

/**
 * Returns an instant answer when the question clearly matches one knowledge
 * base entry, or null to fall back to the LLM. Deliberately conservative —
 * a false negative just means the LLM answers; a false positive would show
 * the wrong answer, so the match threshold is high.
 */
export function findInstantAnswer(question: string): string | null {
  const qt = tokens(question);
  if (qt.length === 0) return null;

  let best: { score: number; overlap: number; answer: string } | null = null;
  for (const { e, toks } of INDEX) {
    if (e.decline) continue; // never answer jailbreak/privacy probes instantly — keep the LLM sentinel + breach alert
    let overlap = 0;
    let rareHit = false;
    for (const t of qt) {
      if (toks.has(t)) {
        overlap++;
        if (isRare(t)) rareHit = true;
      }
    }
    if (overlap < 2 && !(overlap === 1 && rareHit)) continue;
    const score = overlap / qt.length;
    if (!best || score > best.score || (score === best.score && overlap > best.overlap)) {
      best = { score, overlap, answer: e.a };
    }
  }

  if (!best || best.score < 0.6) return null;
  return best.answer;
}
