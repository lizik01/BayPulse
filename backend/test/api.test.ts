import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp, parseOrigins } from "../src/app";
import { tmEvent, tmSearchResponse } from "./fixtures/ticketmaster";
import { calledUrl, jsonResponse, mockFetch } from "./helpers";
import { TEST_API_KEY } from "./setup";

const app = createApp({ frontendUrl: "https://baypulse.vercel.app, http://localhost:5173/" });

const search = (query: Record<string, string | number>) => request(app).get("/api/events/search").query(query);

function expectError(res: request.Response, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({ error: { code, message: expect.any(String) } });
}

describe("GET /health", () => {
  it("reports status and whether the API key is configured", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", ticketmasterConfigured: true });
  });

  it("reports a missing API key without failing", async () => {
    delete process.env.TICKETMASTER_API_KEY;
    const res = await request(app).get("/health");
    expect(res.body.ticketmasterConfigured).toBe(false);
  });
});

describe("GET /api/cities", () => {
  it("returns the city directory, regions and categories", async () => {
    const res = await request(app).get("/api/cities");
    expect(res.status).toBe(200);
    expect(res.body.regions).toEqual(["San Francisco and the Peninsula", "East Bay", "South Bay"]);
    expect(res.body.cities).toHaveLength(18);
    expect(res.body.cities).toContainEqual(expect.objectContaining({ id: "oakland", name: "Oakland", region: "East Bay" }));
  });

  it("assigns every city to a known region with valid coordinates and a unique id", async () => {
    const { body } = await request(app).get("/api/cities");
    const ids = body.cities.map((c: { id: string }) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of body.cities) {
      expect(body.regions).toContain(c.region);
      expect(c.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      // Roughly the nine-county Bay Area.
      expect(c.lat).toBeGreaterThan(36.9);
      expect(c.lat).toBeLessThan(38.9);
      expect(c.lng).toBeGreaterThan(-123.1);
      expect(c.lng).toBeLessThan(-121.2);
    }
  });

  it("does not expose internal Ticketmaster segment names", async () => {
    const { body } = await request(app).get("/api/cities");
    expect(body.categories[0]).toEqual({ id: "music", name: "Music" });
    expect(body.categories.every((c: object) => !("segment" in c))).toBe(true);
  });
});

describe("GET /api/events/search: validation", () => {
  it.each<[string, Record<string, string | number>, string]>([
    ["missing city", {}, "MISSING_CITY"],
    ["blank city", { city: "  " }, "MISSING_CITY"],
    ["unknown city", { city: "los-angeles" }, "UNKNOWN_CITY"],
    ["unknown category", { city: "oakland", category: "opera" }, "UNKNOWN_CATEGORY"],
    ["malformed date", { city: "oakland", startDate: "11/01/2026" }, "INVALID_DATE"],
    ["impossible date (Feb 30)", { city: "oakland", startDate: "2026-02-30" }, "INVALID_DATE"],
    ["impossible date (Apr 31)", { city: "oakland", endDate: "2026-04-31" }, "INVALID_DATE"],
    ["Feb 29 in a non-leap year", { city: "oakland", startDate: "2027-02-29" }, "INVALID_DATE"],
    ["month 13", { city: "oakland", startDate: "2026-13-01" }, "INVALID_DATE"],
    ["reversed date range", { city: "oakland", startDate: "2026-12-10", endDate: "2026-12-01" }, "INVALID_DATE_RANGE"],
    ["size too large", { city: "oakland", size: 51 }, "INVALID_PARAM"],
    ["size zero", { city: "oakland", size: 0 }, "INVALID_PARAM"],
    ["negative page", { city: "oakland", page: -1 }, "INVALID_PARAM"],
    ["fractional page", { city: "oakland", page: 1.5 }, "INVALID_PARAM"],
    ["hex page", { city: "oakland", page: "0x10" }, "INVALID_PARAM"],
    ["exponent size", { city: "oakland", size: "1e1" }, "INVALID_PARAM"],
    ["paging past Ticketmaster's 1000-result limit", { city: "oakland", size: 50, page: 20 }, "INVALID_PARAM"],
    ["radius too large", { city: "oakland", radius: 51 }, "INVALID_PARAM"],
    ["keyword over 100 chars", { city: "oakland", keyword: "x".repeat(101) }, "INVALID_PARAM"],
  ])("rejects %s with 400", async (_label, query, code) => {
    const fetch = mockFetch(jsonResponse(tmSearchResponse([])));
    expectError(await search(query), 400, code);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts Feb 29 in a leap year", async () => {
    mockFetch(jsonResponse(tmSearchResponse([])));
    expect((await search({ city: "oakland", startDate: "2028-02-29" })).status).toBe(200);
  });

  it("accepts a single-day range", async () => {
    mockFetch(jsonResponse(tmSearchResponse([])));
    expect((await search({ city: "oakland", startDate: "2026-11-07", endDate: "2026-11-07" })).status).toBe(200);
  });

  it("accepts the last page inside the 1000-result limit", async () => {
    mockFetch(jsonResponse(tmSearchResponse([])));
    expect((await search({ city: "oakland", size: 50, page: 19 })).status).toBe(200);
  });
});

describe("GET /api/events/search: results", () => {
  it("returns the city, search mode, normalized events and paging", async () => {
    mockFetch(jsonResponse(tmSearchResponse([tmEvent()])));
    const res = await search({ city: "san-jose" });

    expect(res.status).toBe(200);
    expect(res.body.city).toMatchObject({ id: "san-jose", name: "San Jose" });
    expect(res.body.searchMode).toEqual({ type: "city" });
    expect(res.body.events[0]).toMatchObject({ id: "G5vYZ_CrQs_c-", venue: { name: "SAP Center" } });
    expect(res.body.page).toMatchObject({ totalElements: 1 });
  });

  it("reports radius mode and maps the category to its Ticketmaster segment", async () => {
    const fetch = mockFetch(jsonResponse(tmSearchResponse([])));
    const res = await search({ city: "palo-alto", radius: 10, category: "arts", keyword: " hamilton " });

    expect(res.body.searchMode).toEqual({ type: "radius", miles: 10 });
    const q = calledUrl(fetch).searchParams;
    expect(q.get("segmentName")).toBe("Arts & Theatre");
    expect(q.get("keyword")).toBe("hamilton");
  });

  it("treats radius=0 as a city-name search", async () => {
    mockFetch(jsonResponse(tmSearchResponse([])));
    expect((await search({ city: "oakland", radius: 0 })).body.searchMode).toEqual({ type: "city" });
  });

  it("turns Ticketmaster rate limiting into a 503 with a friendly message", async () => {
    mockFetch(jsonResponse({}, 429));
    expectError(await search({ city: "oakland" }), 503, "RATE_LIMITED");
  });
});

describe("GET /api/events/:id", () => {
  it("returns one event", async () => {
    mockFetch(jsonResponse(tmEvent()));
    const res = await request(app).get("/api/events/G5vYZ_CrQs_c-");
    expect(res.status).toBe(200);
    expect(res.body.event.name).toBe("San Jose Sharks vs. Buffalo Sabres");
  });

  it("rejects ids with unexpected characters before calling Ticketmaster", async () => {
    const fetch = mockFetch(jsonResponse(tmEvent()));
    expectError(await request(app).get("/api/events/abc.json%3Fapikey%3Dx"), 400, "INVALID_ID");
    expectError(await request(app).get(`/api/events/${"a".repeat(65)}`), 400, "INVALID_ID");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes through 404 for unknown events", async () => {
    mockFetch(jsonResponse({}, 404));
    expectError(await request(app).get("/api/events/doesNotExist"), 404, "NOT_FOUND");
  });
});

describe("error responses", () => {
  it("returns JSON 404 for unknown routes", async () => {
    expectError(await request(app).get("/"), 404, "NOT_FOUND");
    expectError(await request(app).post("/api/cities"), 404, "NOT_FOUND");
  });

  it("hides unexpected errors (which may contain the API key) behind a generic 500", async () => {
    // Simulate an unexpected failure whose message includes the upstream URL (and so the key).
    mockFetch(
      () =>
        ({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error(`Unexpected token at https://app.ticketmaster.com/?apikey=${TEST_API_KEY}`);
          },
        }) as unknown as Response,
    );
    const res = await search({ city: "oakland" });
    expectError(res, 500, "INTERNAL_ERROR");
    expect(res.text).not.toContain(TEST_API_KEY);
  });
});

describe("CORS and headers", () => {
  it("allows configured frontend origins", async () => {
    const res = await request(app).get("/api/cities").set("Origin", "https://baypulse.vercel.app");
    expect(res.headers["access-control-allow-origin"]).toBe("https://baypulse.vercel.app");
  });

  it("ignores a trailing slash in FRONTEND_URL", async () => {
    const res = await request(app).get("/api/cities").set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("does not allow other origins", async () => {
    const res = await request(app).get("/api/cities").set("Origin", "https://evil.example.com");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers preflight requests from allowed origins", async () => {
    const res = await request(app)
      .options("/api/events/search")
      .set("Origin", "https://baypulse.vercel.app")
      .set("Access-Control-Request-Method", "GET");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("https://baypulse.vercel.app");
  });

  it("does not advertise Express", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("parseOrigins trims entries, strips trailing slashes and drops blanks", () => {
    expect(parseOrigins(" https://a.app/ ,, http://localhost:5173 ")).toEqual(["https://a.app", "http://localhost:5173"]);
  });
});
