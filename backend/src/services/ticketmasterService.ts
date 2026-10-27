import type { City } from "../config/cities";
import { AppError } from "../middleware/errorHandler";
import type { Event, SearchResult } from "../models/event";
import { TtlCache } from "../utils/cache";

const BASE_URL = "https://app.ticketmaster.com/discovery/v2";
const TIMEOUT_MS = 10_000;

export interface SearchParams {
  city: City;
  keyword?: string;
  /** Ticketmaster segment name, e.g. "Music". */
  segment?: string;
  /** YYYY-MM-DD, interpreted in the event's local day. */
  startDate?: string;
  endDate?: string;
  /** When set, search within this many miles of the city center instead of by city name. */
  radius?: number;
  page: number;
  size: number;
}

const searchCache = new TtlCache<SearchResult>(5 * 60_000);
const detailCache = new TtlCache<Event>(10 * 60_000);

function apiKey(): string {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) {
    throw new AppError(500, "CONFIG_ERROR", "Ticketmaster API key is not configured on the server");
  }
  return key;
}

async function request(path: string, query: Record<string, string>): Promise<any> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey());

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new AppError(
      timedOut ? 504 : 502,
      timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
      timedOut ? "Ticketmaster took too long to respond" : "Could not reach Ticketmaster",
    );
  }

  if (res.status === 404) throw new AppError(404, "NOT_FOUND", "Event not found");
  if (res.status === 429) {
    throw new AppError(503, "RATE_LIMITED", "Too many requests to Ticketmaster. Please try again shortly.");
  }
  if (res.status === 401 || res.status === 403) {
    console.error(`Ticketmaster rejected the API key (HTTP ${res.status})`);
    throw new AppError(502, "UPSTREAM_AUTH", "Event provider rejected the request");
  }
  if (!res.ok) {
    console.error(`Ticketmaster error HTTP ${res.status} for ${path}`);
    throw new AppError(502, "UPSTREAM_ERROR", "Event provider returned an error");
  }
  return res.json();
}

/** Ticketmaster wants UTC as YYYY-MM-DDTHH:mm:ssZ (no milliseconds). */
const toTmUtc = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * Converts the start or end of a Bay Area local day (America/Los_Angeles) to a Ticketmaster UTC
 * timestamp, so "Dec 31" means midnight to midnight Pacific rather than UTC.
 */
function tmDate(date: string, endOfDay: boolean): string {
  const wallClock = new Date(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}Z`);
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    timeZoneName: "longOffset",
  })
    .formatToParts(wallClock)
    .find((p) => p.type === "timeZoneName")?.value; // e.g. "GMT-07:00"
  const m = offsetName?.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offsetMin = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return toTmUtc(new Date(wallClock.getTime() - offsetMin * 60_000));
}

export async function searchEvents(p: SearchParams): Promise<SearchResult> {
  const query: Record<string, string> = {
    countryCode: "US",
    sort: "date,asc",
    page: String(p.page),
    size: String(p.size),
  };

  if (p.radius) {
    query.latlong = `${p.city.lat},${p.city.lng}`;
    query.radius = String(p.radius);
    query.unit = "miles";
  } else {
    query.city = p.city.name;
    query.stateCode = p.city.state;
  }
  if (p.keyword) query.keyword = p.keyword;
  if (p.segment) query.segmentName = p.segment;
  // Default to "from now" so past events don't show up.
  query.startDateTime = p.startDate ? tmDate(p.startDate, false) : toTmUtc(new Date());
  if (p.endDate) query.endDateTime = tmDate(p.endDate, true);

  const cacheKey = JSON.stringify({ ...query, startDateTime: p.startDate ?? "now" });
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const data = await request("/events.json", query);
  const result: SearchResult = {
    events: (data?._embedded?.events ?? []).map(normalizeEvent),
    page: {
      number: data?.page?.number ?? p.page,
      size: data?.page?.size ?? p.size,
      totalElements: data?.page?.totalElements ?? 0,
      totalPages: data?.page?.totalPages ?? 0,
    },
  };
  searchCache.set(cacheKey, result);
  return result;
}

export async function getEventById(id: string): Promise<Event> {
  const cached = detailCache.get(id);
  if (cached) return cached;
  const data = await request(`/events/${encodeURIComponent(id)}.json`, {});
  const event = normalizeEvent(data);
  detailCache.set(id, event);
  return event;
}

function pickImage(images: any[] | undefined): string | null {
  if (!images?.length) return null;
  // Prefer a wide 16:9 image that's big enough for a card, but not huge.
  const wide = images
    .filter((i) => i.ratio === "16_9" && i.width >= 500)
    .sort((a, b) => a.width - b.width);
  return (wide[0] ?? images[0]).url ?? null;
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

function normalizeEvent(e: any): Event {
  const v = e?._embedded?.venues?.[0];
  const cls = e?.classifications?.find((c: any) => c.primary) ?? e?.classifications?.[0];
  const price = e?.priceRanges?.[0];
  const clean = (s: unknown) => (typeof s === "string" && s !== "Undefined" && s !== "Other" ? s : null);

  return {
    id: e.id,
    name: e.name ?? "Untitled event",
    url: e.url ?? null,
    imageUrl: pickImage(e.images),
    date: e?.dates?.start?.localDate ?? null,
    time: e?.dates?.start?.localTime ?? null,
    dateTime: e?.dates?.start?.dateTime ?? null,
    timezone: e?.dates?.timezone ?? v?.timezone ?? null,
    status: e?.dates?.status?.code ?? null,
    category: clean(cls?.segment?.name),
    genre: clean(cls?.genre?.name),
    description: e.description ?? e.info ?? null,
    pleaseNote: e.pleaseNote ?? null,
    priceRange: price
      ? { min: toNumber(price.min), max: toNumber(price.max), currency: price.currency ?? "USD" }
      : null,
    venue: v
      ? {
          id: v.id,
          name: v.name ?? "Unknown venue",
          address: v.address?.line1 ?? null,
          city: v.city?.name ?? null,
          state: v.state?.stateCode ?? null,
          postalCode: v.postalCode ?? null,
          lat: toNumber(v.location?.latitude),
          lng: toNumber(v.location?.longitude),
        }
      : null,
  };
}
