import { describe, it, expect } from "vitest";
import { getPhase, Phase, POST_WEDDING_CUTOFF } from "@/lib/phase";
import { WEDDING_DATE } from "@/lib/constants";

const HOUR = 60 * 60 * 1000;

const dayBefore = new Date(WEDDING_DATE.getTime() - 24 * HOUR);
const weddingDayMorning = new Date(WEDDING_DATE.getTime() + 10 * HOUR); // 10 AM IST
const justBeforeCutoff = new Date(POST_WEDDING_CUTOFF.getTime() - 1000); // 9:59:59 PM IST
const justAfterCutoff = new Date(POST_WEDDING_CUTOFF.getTime() + 1000); // 10:00:01 PM IST
const dayAfter = new Date(WEDDING_DATE.getTime() + 24 * HOUR);

describe("getPhase", () => {
  it("returns RETURN_VISIT when no guest name provided", () => {
    expect(getPhase(null, dayBefore)).toBe(Phase.RETURN_VISIT);
  });

  it("returns RETURN_VISIT on wedding day with no guest name", () => {
    expect(getPhase(null, weddingDayMorning)).toBe(Phase.RETURN_VISIT);
  });

  it("returns INVITATION when name exists but invitation not seen", () => {
    expect(getPhase("James", dayBefore, false)).toBe(Phase.INVITATION);
  });

  it("returns RETURN_VISIT when name exists and invitation already seen", () => {
    expect(getPhase("James", dayBefore, true)).toBe(Phase.RETURN_VISIT);
  });

  it("returns RETURN_VISIT when no name regardless of invitationSeen", () => {
    expect(getPhase(null, dayBefore, true)).toBe(Phase.RETURN_VISIT);
    expect(getPhase(null, dayBefore, false)).toBe(Phase.RETURN_VISIT);
  });

  it("returns WEDDING_DAY when name set, invitation seen, and it's wedding day morning", () => {
    expect(getPhase("James", weddingDayMorning, true)).toBe(Phase.WEDDING_DAY);
  });

  it("returns WEDDING_DAY even if invitation not yet seen — date-based phases take priority", () => {
    expect(getPhase("James", weddingDayMorning, false)).toBe(Phase.WEDDING_DAY);
  });

  it("returns WEDDING_DAY right up until 10 PM IST on the wedding day", () => {
    expect(getPhase("James", justBeforeCutoff, true)).toBe(Phase.WEDDING_DAY);
  });

  it("returns POST_WEDDING starting exactly at 10 PM IST on the wedding day itself", () => {
    expect(getPhase("James", justAfterCutoff, true)).toBe(Phase.POST_WEDDING);
    expect(getPhase("James", POST_WEDDING_CUTOFF, true)).toBe(Phase.POST_WEDDING);
  });

  it("returns POST_WEDDING when name exists and date is after wedding day", () => {
    expect(getPhase("James", dayAfter, true)).toBe(Phase.POST_WEDDING);
  });

  it("returns RETURN_VISIT just before midnight the day before (IST)", () => {
    const almostMidnight = new Date(WEDDING_DATE.getTime() - 1000);
    expect(getPhase("Sharon", almostMidnight, true)).toBe(Phase.RETURN_VISIT);
  });

  it("returns WEDDING_DAY at the exact start of the wedding day (00:00 IST)", () => {
    expect(getPhase("Sharon", WEDDING_DATE, true)).toBe(Phase.WEDDING_DAY);
  });
});
