import { afterEach, describe, expect, it, vi } from "vitest";
import { findCity } from "../src/config/cities";
import { AppError } from "../src/middleware/errorHandler";
import { getEventById, searchEvents, type SearchParams } from "../src/services/ticketmasterService";
import { tmEvent, tmSearchResponse } from "./fixtures/ticketmaster";
import { calledUrl, jsonResponse, mockFetch, timeoutError } from "./helpers";
import { TEST_API_KEY } from "./setup";

const sanJose = findCity("san-jose")!;
const params = (p: Partial<SearchParams> = {}): SearchParams => ({ city: sanJose, page: 0, size: 20, ...p });

async function expectAppError(promise: Promise<unknown>, status: number, code: string) {
  const err = await promise.then(
    () => {
      throw new Error("expected the call to fail");
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  expect(err).toMatchObject({ status, code });
  return err as AppError;
}

describe("searchEvents: Ticketmaster query", () => {
  afterEach(() => vi.useRealTimers());

  it("searches by city name and state by default", async () => {
    const fetch = mockFetch(jsonResponse(tmSearchResponse([])));
    await searchEvents(params());
    const q = calledUrl(fetch).searchParams;

    expect(calledUrl(fetch).pathname).toBe("/discovery/v2/events.json");
    expect(q.get("city")).toBe("San Jose");
    expect(q.get("stateCode")).toBe("CA");
    expect(q.get("countryCode")).toBe("US");
    expect(q.get("sort")).toBe("date,asc");
    expect(q.get("apikey")).toBe(TEST_API_KEY);
    expect(q.has("latlong")).toBe(false);
  });

  it("switches to a lat/long radius search when a radius is given", async () => {
    const fetch = mockFetch(jsonResponse(tmSearchResponse([])));
    await searchEvents(params({ radius: 10 }));
    const q = calledUrl(fetch).searchParams;

    expect(q.get("latlong")).toBe("37.3382,-121.8863");
    expect(q.get("radius")).toBe("10");
    expect(q.get("unit")).toBe("miles");
    expect(q.has("city")).toBe(false);
  });

  it("passes keyword, segment and paging through", async () => {
    const fetch = mockFetch(jsonResponse(tmSearchResponse([])));
    await searchEvents(params({ keyword: "jazz & blues", segment: "Arts & Theatre", page: 2, size: 24 }));
    const q = calledUrl(fetch).searchParams;

    expect(q.get("keyword")).toBe("jazz & blues");
    expect(q.get("segmentName")).toBe("Arts & Theatre");
    expect(q.get("page")).toBe("2");
    expect(q.get("size")).toBe("24");
  });

  it("converts the date range to Bay Area day boundaries in UTC", async () => {
    const fetch = mockFetch(jsonResponse(tmSearchResponse([])));
    await searchEvents(params({ startDate: "2026-12-01", endDate: "2026-12-31" }));
    const q = calledUrl(fetch).searchParams;

    expect(q.get("startDateTime")).toBe("2026-12-01T08:00:00Z");
    expect(q.get("endDateTime")).toBe("2027-01-01T07:59:59Z");
  });

  it("defaults to events starting from now, so past events are excluded", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-29T18:30:15.123Z"), toFake: ["Date"] });
    const fetch = mockFetch(jsonResponse(tmSearchResponse([])));
    await searchEvents(params());
    const q = calledUrl(fetch).searchParams;

    expect(q.get("startDateTime")).toBe("2026-10-29T18:30:15Z");
    expect(q.has("endDateTime")).toBe(false);
  });
});

describe("searchEvents: response handling", () => {
  it("normalizes events and page info", async () => {
    mockFetch(
      jsonResponse(tmSearchResponse([tmEvent(), tmEvent({ id: "second" })], { size: 2, totalElements: 57, totalPages: 29, number: 0 })),
    );
    const result = await searchEvents(params({ size: 2 }));

    expect(result.events.map((e) => e.id)).toEqual(["G5vYZ_CrQs_c-", "second"]);
    expect(result.events[0].venue?.name).toBe("SAP Center");
    expect(result.page).toEqual({ number: 0, size: 2, totalElements: 57, totalPages: 29 });
  });

  it("returns an empty list when Ticketmaster has no _embedded block", async () => {
    mockFetch(jsonResponse({ page: { size: 20, totalElements: 0, totalPages: 0, number: 0 } }));
    const result = await searchEvents(params());
    expect(result.events).toEqual([]);
    expect(result.page.totalElements).toBe(0);
  });

  it("caches identical searches instead of calling Ticketmaster again", async () => {
    const fetch = mockFetch(jsonResponse(tmSearchResponse([tmEvent()])));
    await searchEvents(params({ keyword: "sharks" }));
    await searchEvents(params({ keyword: "sharks" }));
    expect(fetch).toHaveBeenCalledTimes(1);

    await searchEvents(params({ keyword: "warriors" }));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("Ticketmaster error mapping", () => {
  it.each([
    [404, 404, "NOT_FOUND"],
    [429, 503, "RATE_LIMITED"],
    [401, 502, "UPSTREAM_AUTH"],
    [403, 502, "UPSTREAM_AUTH"],
    [500, 502, "UPSTREAM_ERROR"],
    [503, 502, "UPSTREAM_ERROR"],
  ])("maps upstream HTTP %i to %i %s", async (upstream, status, code) => {
    mockFetch(jsonResponse({ fault: { faultstring: "nope" } }, upstream));
    await expectAppError(searchEvents(params()), status, code);
  });

  it("maps a network failure to 502 UPSTREAM_UNAVAILABLE", async () => {
    mockFetch(new TypeError("fetch failed"));
    await expectAppError(searchEvents(params()), 502, "UPSTREAM_UNAVAILABLE");
  });

  it("maps a timeout to 504 UPSTREAM_TIMEOUT", async () => {
    mockFetch(timeoutError());
    await expectAppError(searchEvents(params()), 504, "UPSTREAM_TIMEOUT");
  });

  it("sends requests with a timeout signal", async () => {
    const fetch = mockFetch(jsonResponse(tmSearchResponse([])));
    await searchEvents(params());
    expect(fetch.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("fails with CONFIG_ERROR, without calling Ticketmaster, when the API key is missing", async () => {
    delete process.env.TICKETMASTER_API_KEY;
    const fetch = mockFetch(jsonResponse(tmSearchResponse([])));
    await expectAppError(searchEvents(params()), 500, "CONFIG_ERROR");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never puts the API key in error messages", async () => {
    mockFetch(jsonResponse({}, 401));
    const err = await expectAppError(searchEvents(params()), 502, "UPSTREAM_AUTH");
    expect(err.message).not.toContain(TEST_API_KEY);
  });

  it("does not cache failures", async () => {
    const fetch = mockFetch(jsonResponse({}, 500), jsonResponse(tmSearchResponse([tmEvent()])));
    await expectAppError(searchEvents(params()), 502, "UPSTREAM_ERROR");
    const result = await searchEvents(params());
    expect(result.events).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("getEventById", () => {
  it("fetches and normalizes a single event", async () => {
    const fetch = mockFetch(jsonResponse(tmEvent()));
    const event = await getEventById("G5vYZ_CrQs_c-");
    expect(calledUrl(fetch).pathname).toBe("/discovery/v2/events/G5vYZ_CrQs_c-.json");
    expect(event.name).toBe("San Jose Sharks vs. Buffalo Sabres");
  });

  it("caches event details", async () => {
    const fetch = mockFetch(jsonResponse(tmEvent()));
    await getEventById("G5vYZ_CrQs_c-");
    await getEventById("G5vYZ_CrQs_c-");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps an unknown id to 404", async () => {
    mockFetch(jsonResponse({ errors: [{ code: "DIS1004" }] }, 404));
    await expectAppError(getEventById("missing"), 404, "NOT_FOUND");
  });
});
