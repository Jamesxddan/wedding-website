import { describe, it, expect } from "vitest";
import { searchCities } from "@/lib/cities";

describe("searchCities", () => {
  it("returns empty array for empty query", () => {
    expect(searchCities("")).toEqual([]);
  });

  it("returns empty array for whitespace-only query", () => {
    expect(searchCities("   ")).toEqual([]);
  });

  it("returns results matching query (case-insensitive)", () => {
    const results = searchCities("chennai");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase()).toContain("chennai");
  });

  it("caps results at 50", () => {
    const results = searchCities("a");
    expect(results.length).toBeLessThanOrEqual(50);
  });

  it("each result has a name property", () => {
    const results = searchCities("london");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => expect(r).toHaveProperty("name"));
  });

  it("returns results matching partial query", () => {
    const results = searchCities("mumb");
    expect(results.some((r) => r.name.toLowerCase().includes("mumb"))).toBe(true);
  });
});
