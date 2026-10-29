import { describe, expect, it } from "vitest";
import { normalizeEvent, pickImage } from "../src/services/ticketmasterService";
import { tmEvent } from "./fixtures/ticketmaster";

describe("normalizeEvent", () => {
  it("maps a complete Ticketmaster event to the API shape", () => {
    expect(normalizeEvent(tmEvent())).toEqual({
      id: "G5vYZ_CrQs_c-",
      name: "San Jose Sharks vs. Buffalo Sabres",
      url: "https://www.ticketmaster.com/event/1C0064E79AC59B61",
      imageUrl: "https://img/16_9_640.jpg",
      date: "2026-10-27",
      time: "19:30:00",
      dateTime: "2026-10-28T02:30:00Z",
      timezone: "America/Los_Angeles",
      status: "onsale",
      category: "Sports",
      genre: "Hockey",
      description: "Arrive early.",
      pleaseNote: "No re-entry.",
      priceRange: { min: 45.5, max: 310, currency: "USD" },
      venue: {
        id: "KovZpZAFnIEA",
        name: "SAP Center",
        address: "525 W Santa Clara St",
        city: "San Jose",
        state: "CA",
        postalCode: "95113",
        lat: 37.3327,
        lng: -121.901,
      },
    });
  });

  it("parses venue coordinates sent as strings", () => {
    const v = normalizeEvent(tmEvent()).venue!;
    expect(typeof v.lat).toBe("number");
    expect(typeof v.lng).toBe("number");
  });

  it("returns null coordinates when the venue has no usable location", () => {
    const noLocation = tmEvent({ _embedded: { venues: [{ id: "v1", name: "Park" }] } });
    expect(normalizeEvent(noLocation).venue).toMatchObject({ lat: null, lng: null, address: null, city: null });

    const garbage = tmEvent({
      _embedded: { venues: [{ id: "v2", name: "X", location: { latitude: "n/a", longitude: "" } }] },
    });
    expect(normalizeEvent(garbage).venue).toMatchObject({ lat: null, lng: null });
  });

  it("returns a null venue when Ticketmaster sends none", () => {
    expect(normalizeEvent(tmEvent({ _embedded: undefined })).venue).toBeNull();
  });

  it("drops placeholder classification names like 'Undefined' and 'Other'", () => {
    const e = normalizeEvent(
      tmEvent({ classifications: [{ primary: true, segment: { name: "Undefined" }, genre: { name: "Other" } }] }),
    );
    expect(e.category).toBeNull();
    expect(e.genre).toBeNull();
  });

  it("prefers the primary classification over the first one", () => {
    const e = normalizeEvent(
      tmEvent({
        classifications: [
          { primary: false, segment: { name: "Film" }, genre: { name: "Drama" } },
          { primary: true, segment: { name: "Music" }, genre: { name: "Rock" } },
        ],
      }),
    );
    expect(e).toMatchObject({ category: "Music", genre: "Rock" });
  });

  it("handles price ranges with string or missing values", () => {
    expect(normalizeEvent(tmEvent({ priceRanges: [{ min: "20", max: "20", currency: "USD" }] })).priceRange).toEqual({
      min: 20,
      max: 20,
      currency: "USD",
    });
    expect(normalizeEvent(tmEvent({ priceRanges: [{ min: 15 }] })).priceRange).toEqual({
      min: 15,
      max: null,
      currency: "USD",
    });
    expect(normalizeEvent(tmEvent({ priceRanges: undefined })).priceRange).toBeNull();
  });

  it("uses description, then info, for the description", () => {
    expect(normalizeEvent(tmEvent({ description: "Official description" })).description).toBe("Official description");
    expect(normalizeEvent(tmEvent({ info: undefined })).description).toBeNull();
  });

  it("survives a minimal event with almost no fields", () => {
    const e = normalizeEvent({ id: "abc" });
    expect(e).toMatchObject({
      id: "abc",
      name: "Untitled event",
      url: null,
      imageUrl: null,
      date: null,
      time: null,
      status: null,
      category: null,
      priceRange: null,
      venue: null,
    });
  });
});

describe("pickImage", () => {
  it("picks the smallest 16:9 image that is at least 500px wide", () => {
    expect(pickImage(tmEvent().images)).toBe("https://img/16_9_640.jpg");
  });

  it("falls back to the first image when there's no suitable 16:9 one", () => {
    expect(pickImage([{ ratio: "4_3", width: 305, url: "https://img/a.jpg" }])).toBe("https://img/a.jpg");
  });

  it("returns null when there are no images", () => {
    expect(pickImage([])).toBeNull();
    expect(pickImage(undefined)).toBeNull();
  });
});
