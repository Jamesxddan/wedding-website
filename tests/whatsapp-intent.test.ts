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
});
