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

// Escape regex special characters in a phrase so it can be dropped into a
// RegExp literally (phrases like "can't" and "sorry, can't" contain
// characters that are harmless here but this keeps the helper generically safe).
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary-aware match: a plain .includes() would let "yes" match
// inside "yesterday", "sure"/"might" match inside "ensure"/"measure"/
// "pleasure"/"mighty", etc. \b anchors on the phrase's outer edges only, so
// an apostrophe in the middle of a phrase (e.g. "can't") doesn't interfere.
function matchesAnyPhrase(text, phrases) {
  return phrases.some((phrase) => new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i").test(text));
}

export function classifyIntent(text) {
  // Curly/smart apostrophes (U+2019 ', U+2018 ') are what iOS and many
  // Android keyboards actually send — normalize to a straight apostrophe
  // before matching, or phrases like "can't make it" never match at all.
  const normalized = String(text ?? "").replace(/[’‘]/g, "'");

  const matched = {
    attending: matchesAnyPhrase(normalized, ATTENDING_PHRASES),
    not_attending: matchesAnyPhrase(normalized, NOT_ATTENDING_PHRASES),
    maybe: matchesAnyPhrase(normalized, MAYBE_PHRASES),
  };

  const categories = Object.keys(matched).filter((k) => matched[k]);
  return categories.length === 1 ? categories[0] : "unclear";
}
