import { describe, it, expect } from "vitest";
import { getPhase, Phase } from "@/lib/phase";
import { WEDDING_DATE } from "@/lib/constants";

const dayBefore = new Date(WEDDING_DATE.getTime() - 24 * 60 * 60 * 1000);
const weddingDay = new Date(WEDDING_DATE);
weddingDay.setHours(10, 0, 0, 0);
const dayAfter = new Date(WEDDING_DATE.getTime() + 24 * 60 * 60 * 1000);

describe("getPhase", () => {
  it("returns FIRST_VISIT when no guest name provided", () => {
    expect(getPhase(null, dayBefore)).toBe(Phase.FIRST_VISIT);
  });

  it("returns FIRST_VISIT on wedding day with no guest name", () => {
    expect(getPhase(null, weddingDay)).toBe(Phase.FIRST_VISIT);
  });

  it("returns RETURN_VISIT when name exists and date is before wedding day", () => {
    expect(getPhase("James", dayBefore)).toBe(Phase.RETURN_VISIT);
  });

  it("returns WEDDING_DAY when name exists and date is the wedding day", () => {
    expect(getPhase("James", weddingDay)).toBe(Phase.WEDDING_DAY);
  });

  it("returns POST_WEDDING when name exists and date is after wedding day", () => {
    expect(getPhase("James", dayAfter)).toBe(Phase.POST_WEDDING);
  });

  it("returns RETURN_VISIT at midnight on the day before", () => {
    const midnight = new Date(WEDDING_DATE);
    midnight.setDate(midnight.getDate() - 1);
    midnight.setHours(23, 59, 59, 999);
    expect(getPhase("Sharon", midnight)).toBe(Phase.RETURN_VISIT);
  });

  it("returns WEDDING_DAY at midnight start of wedding day (IST)", () => {
    const startOfDay = new Date(WEDDING_DATE);
    startOfDay.setHours(0, 0, 0, 0);
    expect(getPhase("Sharon", startOfDay)).toBe(Phase.WEDDING_DAY);
  });
});
