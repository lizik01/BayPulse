import { afterEach, describe, expect, it, vi } from "vitest";
import type { Venue } from "../types/event";
import {
  DATE_PRESETS,
  directionsUrl,
  formatAddress,
  formatPrice,
  formatShortDate,
  formatTime,
  toIsoDate,
} from "./dateUtils";

const preset = (id: string) => DATE_PRESETS.find((p) => p.id === id)!.range();

/** Freeze "now" at noon local time on the given date. */
function today(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  vi.useFakeTimers({ now: new Date(y, m - 1, d, 12), toFake: ["Date"] });
}

afterEach(() => vi.useRealTimers());

describe("date presets", () => {
  // Week of Mon Oct 26 – Sun Nov 1, 2026.
  it.each([
    ["Monday", "2026-10-26", "2026-10-30"],
    ["Wednesday", "2026-10-28", "2026-10-30"],
    ["Thursday", "2026-10-29", "2026-10-30"],
    ["Friday", "2026-10-30", "2026-10-30"],
    ["Saturday", "2026-10-31", "2026-10-31"],
    ["Sunday", "2026-11-01", "2026-11-01"],
  ])("'This weekend' on a %s runs from %s… through Sunday", (_day, now, start) => {
    today(now);
    expect(preset("weekend")).toEqual({ startDate: start, endDate: "2026-11-01" });
  });

  it("'This weekend' crosses month boundaries", () => {
    today("2026-12-30"); // Wednesday
    expect(preset("weekend")).toEqual({ startDate: "2027-01-01", endDate: "2027-01-03" });
  });

  it("'Today' is a single day", () => {
    today("2026-10-29");
    expect(preset("today")).toEqual({ startDate: "2026-10-29", endDate: "2026-10-29" });
  });

  it("'Next 7 days' includes today and six more days", () => {
    today("2026-10-29");
    expect(preset("week")).toEqual({ startDate: "2026-10-29", endDate: "2026-11-04" });
  });

  it("'This month' ends on the last day of the month, including February in leap years", () => {
    today("2028-02-10");
    expect(preset("month")).toEqual({ startDate: "2028-02-10", endDate: "2028-02-29" });
  });
});

describe("formatting", () => {
  it("formats dates and times for cards", () => {
    expect(formatShortDate("2026-11-07")).toBe("Sat, Nov 7");
    expect(formatShortDate(null)).toBe("Date TBA");
    expect(formatTime("19:30:00")).toBe("7:30 PM");
    expect(formatTime("00:05:00")).toBe("12:05 AM");
    expect(formatTime(null)).toBeNull();
  });

  it("toIsoDate uses the local calendar day", () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("formats price ranges", () => {
    expect(formatPrice({ min: 45, max: 310, currency: "USD" })).toBe("$45 – $310");
    expect(formatPrice({ min: 20, max: 20, currency: "USD" })).toBe("$20");
    expect(formatPrice({ min: null, max: 99, currency: "USD" })).toBe("$99");
    expect(formatPrice({ min: null, max: null, currency: "USD" })).toBeNull();
    expect(formatPrice(null)).toBeNull();
  });
});

describe("venue helpers", () => {
  const venue: Venue = {
    id: "v1",
    name: "SAP Center",
    address: "525 W Santa Clara St",
    city: "San Jose",
    state: "CA",
    postalCode: "95113",
    lat: 37.3327,
    lng: -121.901,
  };

  it("builds a one-line address, skipping missing parts", () => {
    expect(formatAddress(venue)).toBe("525 W Santa Clara St, San Jose, CA 95113");
    expect(formatAddress({ ...venue, address: null, postalCode: null })).toBe("San Jose, CA");
    expect(formatAddress({ ...venue, address: null, city: null, state: null, postalCode: null })).toBeNull();
  });

  it("links directions to coordinates when available", () => {
    expect(directionsUrl(venue)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=37.3327%2C-121.901",
    );
  });

  it("falls back to the venue name and address without coordinates", () => {
    const url = new URL(directionsUrl({ ...venue, lat: null, lng: null }));
    expect(url.searchParams.get("destination")).toBe("SAP Center, 525 W Santa Clara St, San Jose, CA 95113");
  });
});
