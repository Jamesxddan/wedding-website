import { describe, it, expect } from "vitest";
import { buildGoogleCalendarUrl, buildIcsDataUrl } from "@/lib/calendar";

describe("buildGoogleCalendarUrl", () => {
  it("returns a Google Calendar URL", () => {
    const url = buildGoogleCalendarUrl("James");
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("James");
  });

  it("includes the wedding date", () => {
    const url = buildGoogleCalendarUrl("James");
    expect(url).toContain("20261008");
  });
});

describe("buildIcsDataUrl", () => {
  it("returns a data URI", () => {
    const url = buildIcsDataUrl("James");
    expect(url).toMatch(/^data:text\/calendar/);
  });

  it("contains BEGIN:VCALENDAR and wedding date", () => {
    const raw = atob(buildIcsDataUrl("James").split(",")[1]);
    expect(raw).toContain("BEGIN:VCALENDAR");
    expect(raw).toContain("DTSTART:20261008");
  });
});
