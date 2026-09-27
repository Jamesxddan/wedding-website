// Deliberately simple keyword matching, not an LLM — see
// docs/superpowers/specs/2026-09-27-whatsapp-reply-tracking-design.md for
// why. A message must match exactly one category to auto-classify; no
// match, or matches spanning more than one category, both resolve to
// "unclear" so an ambiguous reply is never guessed at.

const ATTENDING_PHRASES = [
  "yes", "we'll be there", "will attend", "count us in",
  "definitely coming", "sure", "confirmed",
];

const NOT_ATTENDING_PHRASES = [
  "can't make it", "cannot attend", "won't be able",
  "not able to attend", "sorry, can't", "unfortunately",
];

const MAYBE_PHRASES = ["maybe", "not sure", "will try", "let you know", "might"];

export function classifyIntent(text) {
  const lower = String(text ?? "").toLowerCase();

  const matched = {
    attending: ATTENDING_PHRASES.some((p) => lower.includes(p)),
    not_attending: NOT_ATTENDING_PHRASES.some((p) => lower.includes(p)),
    maybe: MAYBE_PHRASES.some((p) => lower.includes(p)),
  };

  const categories = Object.keys(matched).filter((k) => matched[k]);
  return categories.length === 1 ? categories[0] : "unclear";
}
