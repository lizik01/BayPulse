import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import EventCard from "../components/EventCard";
import EventMap from "../components/EventMap";
import FilterPanel from "../components/FilterPanel";
import SearchBar from "../components/SearchBar";
import StatusMessage, { CardSkeletons } from "../components/StatusMessage";
import { errorMessage, getCityDirectory, searchEvents } from "../services/eventService";
import type { CityDirectory } from "../types/city";
import type { SearchFilters, SearchResponse } from "../types/event";

const FILTER_KEYS = ["keyword", "category", "startDate", "endDate", "radius", "page"] as const;

function readFilters(params: URLSearchParams): SearchFilters {
  const num = (k: string) => {
    const n = Number(params.get(k));
    return Number.isInteger(n) && n > 0 ? n : undefined;
  };
  return {
    keyword: params.get("keyword") || undefined,
    category: params.get("category") || undefined,
    startDate: params.get("startDate") || undefined,
    endDate: params.get("endDate") || undefined,
    radius: num("radius"),
    page: num("page"),
  };
}

export default function CityEventsPage() {
  const { cityId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);

  const [directory, setDirectory] = useState<CityDirectory | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [retry, setRetry] = useState(0);
  const cardRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    getCityDirectory().then(setDirectory).catch(() => {});
  }, []);

  const city = directory?.cities.find((c) => c.id === cityId) ?? result?.city;
  const unknownCity = directory !== null && !directory.cities.some((c) => c.id === cityId);
  const invalidRange = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate);

  useEffect(() => {
    if (unknownCity || invalidRange) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedId(null);
    searchEvents(cityId, filters, controller.signal)
      .then(setResult)
      .catch((err) => {
        if (!axios.isCancel(err)) setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [cityId, filters, unknownCity, invalidRange, retry]);

  useEffect(() => {
    if (city) document.title = `Events in ${city.name} · BayPulse`;
  }, [city]);

  const updateFilters = useCallback(
    (patch: Partial<SearchFilters>) => {
      const next = { ...filters, page: undefined, ...patch };
      const out = new URLSearchParams();
      for (const k of FILTER_KEYS) {
        const v = next[k];
        if (v !== undefined && v !== "" && v !== 0) out.set(k, String(v));
      }
      setParams(out);
    },
    [filters, setParams],
  );

  // Selecting a marker scrolls its card into view.
  const selectFromMap = useCallback((id: string) => {
    setSelectedId(id);
    cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  if (unknownCity) {
    return (
      <StatusMessage tone="error" title="We don't cover that city yet">
        <p>
          “{cityId}” isn't in the Bay Area city directory. <Link to="/">Pick another city</Link>.
        </p>
      </StatusMessage>
    );
  }

  const events = result?.events ?? [];
  const page = result?.page;
  const currentPage = filters.page ?? 0;
  const areaLabel = filters.radius ? `within ${filters.radius} mi of ${city?.name ?? "…"}` : `in ${city?.name ?? "…"}`;

  return (
    <div className="city-page">
      <header className="city-page__header">
        <Link to="/" className="back-link">
          ← All cities
        </Link>
        <h1>
          Events {areaLabel}
          {city && <span className="city-page__region">{city.region}</span>}
        </h1>
        <SearchBar value={filters.keyword ?? ""} onSearch={(keyword) => updateFilters({ keyword: keyword || undefined })} />
        <FilterPanel
          categories={directory?.categories ?? []}
          filters={filters}
          onChange={updateFilters}
          onReset={() => setParams(new URLSearchParams())}
        />
      </header>

      <div className="view-toggle" role="tablist" aria-label="Results view">
        {(["list", "map"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={mobileView === v}
            className={mobileView === v ? "active" : ""}
            onClick={() => setMobileView(v)}
          >
            {v === "list" ? "List" : "Map"}
          </button>
        ))}
      </div>

      <div className={`results results--${mobileView}`}>
        <section className="results__list" aria-live="polite" aria-busy={loading}>
          {!loading && !error && page && (
            <p className="results__count">
              {page.totalElements === 0
                ? "No events found"
                : `${page.totalElements.toLocaleString()} upcoming event${page.totalElements === 1 ? "" : "s"}`}
              {filters.keyword && <> for “{filters.keyword}”</>}
            </p>
          )}

          {loading && <CardSkeletons />}

          {!loading && error && (
            <StatusMessage tone="error" title="Couldn't load events" action={{ label: "Retry", onClick: () => setRetry((n) => n + 1) }}>
              {error}
            </StatusMessage>
          )}

          {!loading && !error && invalidRange && (
            <StatusMessage title="Check your dates">Pick a start date that's on or before the end date.</StatusMessage>
          )}

          {!loading && !error && !invalidRange && events.length === 0 && (
            <StatusMessage title="Nothing matches yet">
              <p>Try a different keyword or date range, or widen the area to nearby cities.</p>
              {!filters.radius && (
                <button type="button" className="btn btn--ghost" onClick={() => updateFilters({ radius: 10 })}>
                  Search within 10 miles
                </button>
              )}
            </StatusMessage>
          )}

          {!loading && !error && events.length > 0 && (
            <>
              <div className="event-grid">
                {events.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    selected={e.id === selectedId}
                    onSelect={setSelectedId}
                    ref={(el) => {
                      if (el) cardRefs.current.set(e.id, el);
                      else cardRefs.current.delete(e.id);
                    }}
                  />
                ))}
              </div>
              {page && page.totalPages > 1 && (
                <nav className="pager" aria-label="Pagination">
                  <button
                    className="btn btn--ghost"
                    disabled={currentPage === 0}
                    onClick={() => updateFilters({ page: currentPage - 1 || undefined })}
                  >
                    ← Previous
                  </button>
                  <span>
                    Page {currentPage + 1} of {Math.min(page.totalPages, Math.floor(1000 / page.size))}
                  </span>
                  <button
                    className="btn btn--ghost"
                    disabled={currentPage + 1 >= Math.min(page.totalPages, Math.floor(1000 / page.size))}
                    onClick={() => updateFilters({ page: currentPage + 1 })}
                  >
                    Next →
                  </button>
                </nav>
              )}
            </>
          )}
        </section>

        <aside className="results__map">
          {city && (
            <EventMap
              center={[city.lat, city.lng]}
              events={loading ? [] : events}
              selectedId={selectedId}
              onSelect={selectFromMap}
            />
          )}
        </aside>
      </div>

      <p className="attribution">Event data from Ticketmaster. Availability and prices may change.</p>
    </div>
  );
}
