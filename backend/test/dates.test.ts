import { describe, expect, it } from "vitest";
import { tmDate } from "../src/services/ticketmasterService";

// Bay Area days are converted to UTC for Ticketmaster. PDT is UTC-7, PST is UTC-8.
describe("tmDate (Bay Area local day -> Ticketmaster UTC)", () => {
  it("converts a summer (PDT) day", () => {
    expect(tmDate("2026-07-04", false)).toBe("2026-07-04T07:00:00Z");
    expect(tmDate("2026-07-04", true)).toBe("2026-07-05T06:59:59Z");
  });

  it("converts a winter (PST) day", () => {
    expect(tmDate("2026-01-15", false)).toBe("2026-01-15T08:00:00Z");
    expect(tmDate("2026-01-15", true)).toBe("2026-01-16T07:59:59Z");
  });

  it("handles the day DST ends (Nov 1, 2026: midnight is PDT, 23:59 is PST)", () => {
    expect(tmDate("2026-11-01", false)).toBe("2026-11-01T07:00:00Z");
    expect(tmDate("2026-11-01", true)).toBe("2026-11-02T07:59:59Z");
  });

  it("handles the day DST starts (Mar 8, 2026: midnight is PST, 23:59 is PDT)", () => {
    expect(tmDate("2026-03-08", false)).toBe("2026-03-08T08:00:00Z");
    expect(tmDate("2026-03-08", true)).toBe("2026-03-09T06:59:59Z");
  });

  it("rolls over month and year boundaries", () => {
    expect(tmDate("2026-12-31", true)).toBe("2027-01-01T07:59:59Z");
    expect(tmDate("2026-10-31", true)).toBe("2026-11-01T06:59:59Z");
  });

  it("handles leap days", () => {
    expect(tmDate("2028-02-29", false)).toBe("2028-02-29T08:00:00Z");
  });

  it("emits the exact format Ticketmaster accepts (no milliseconds)", () => {
    expect(tmDate("2026-05-05", false)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});
