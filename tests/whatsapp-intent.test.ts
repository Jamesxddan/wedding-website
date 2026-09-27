import { describe, it, expect } from "vitest";
import { classifyIntent } from "../scripts/lib/whatsapp-intent.mjs";

describe("classifyIntent", () => {
  it("classifies a clear yes as attending", () => {
    expect(classifyIntent("Yes we'll be there!")).toBe("attending");
  });

  it("classifies 'count us in' as attending", () => {
    expect(classifyIntent("count us in")).toBe("attending");
  });

  it("classifies a clear no as not_attending", () => {
    expect(classifyIntent("Sorry, can't make it that weekend")).toBe("not_attending");
  });

  it("classifies 'unfortunately' as not_attending", () => {
    expect(classifyIntent("Unfortunately we have a conflict")).toBe("not_attending");
  });

  it("classifies 'maybe' as maybe", () => {
    expect(classifyIntent("maybe, will confirm soon")).toBe("maybe");
  });

  it("classifies an unrelated message as unclear", () => {
    expect(classifyIntent("Congratulations to the both of you!")).toBe("unclear");
  });

  it("classifies an empty/missing message as unclear without throwing", () => {
    expect(classifyIntent("")).toBe("unclear");
    // @ts-expect-error deliberately testing null input from a loosely-typed caller
    expect(classifyIntent(null)).toBe("unclear");
  });

  it("classifies a message matching more than one category as unclear (documents the fail-safe collision rule)", () => {
    // "not sure" matches the `maybe` phrase list directly, but also contains
    // "sure" which matches the `attending` list — the ambiguity itself, not
    // either single keyword, is what must win here.
    expect(classifyIntent("not sure yet, will let you know")).toBe("unclear");
  });

  it("is case-insensitive", () => {
    expect(classifyIntent("YES WE'LL BE THERE")).toBe("attending");
  });

  // --- Word-boundary matching (final review finding 3) ---

  it("does not classify 'yesterday' as attending via the 'yes' substring", () => {
    expect(classifyIntent("Got your message yesterday")).toBe("unclear");
  });

  it("does not classify 'ensure'/'measure'/'pleasure' as attending via the 'sure' substring", () => {
    expect(classifyIntent("Just want to ensure this reaches you")).toBe("unclear");
    expect(classifyIntent("It's a measure of how excited we are")).toBe("unclear");
    expect(classifyIntent("What a pleasure to be invited")).toBe("unclear");
  });

  it("does not classify 'mighty' as maybe via the 'might' substring", () => {
    expect(classifyIntent("What a mighty celebration this will be")).toBe("unclear");
  });

  it("'make sure' is still a genuine standalone 'sure' match, but a message that also hits 'let you know' correctly resolves to unclear via the fail-safe collision rule (not a false 'attending')", () => {
    // "sure" legitimately matches ATTENDING here (it's a real standalone
    // word in "make sure", not a substring of a longer word like "ensure"),
    // so the word-boundary fix alone doesn't — and isn't meant to — suppress
    // it. What keeps this from wrongly resolving to "attending" is that the
    // message also contains "let you know" (a MAYBE phrase): both categories
    // fire, so the existing multi-category collision rule sends it to
    // "unclear" rather than confidently guessing "attending".
    expect(classifyIntent("Let me make sure, I'll let you know soon")).toBe("unclear");
  });

  it("classifies a curly-apostrophe decline as not_attending (smart quotes from iOS/Android keyboards)", () => {
    expect(classifyIntent("Sorry, can’t make it")).toBe("not_attending");
    expect(classifyIntent("We won’t be able to come")).toBe("not_attending");
  });
});
