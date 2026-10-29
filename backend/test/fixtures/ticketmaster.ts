/** Trimmed-down but realistic Ticketmaster Discovery v2 payloads. */
export function tmEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "G5vYZ_CrQs_c-",
    name: "San Jose Sharks vs. Buffalo Sabres",
    url: "https://www.ticketmaster.com/event/1C0064E79AC59B61",
    info: "Arrive early.",
    pleaseNote: "No re-entry.",
    images: [
      { ratio: "3_2", width: 640, url: "https://img/3_2_640.jpg" },
      { ratio: "16_9", width: 2048, url: "https://img/16_9_2048.jpg" },
      { ratio: "16_9", width: 640, url: "https://img/16_9_640.jpg" },
      { ratio: "16_9", width: 205, url: "https://img/16_9_205.jpg" },
    ],
    dates: {
      start: { localDate: "2026-10-27", localTime: "19:30:00", dateTime: "2026-10-28T02:30:00Z" },
      timezone: "America/Los_Angeles",
      status: { code: "onsale" },
    },
    classifications: [
      { primary: true, segment: { name: "Sports" }, genre: { name: "Hockey" } },
    ],
    priceRanges: [{ type: "standard", currency: "USD", min: 45.5, max: 310 }],
    _embedded: {
      venues: [
        {
          id: "KovZpZAFnIEA",
          name: "SAP Center",
          postalCode: "95113",
          timezone: "America/Los_Angeles",
          city: { name: "San Jose" },
          state: { stateCode: "CA" },
          address: { line1: "525 W Santa Clara St" },
          location: { longitude: "-121.90100", latitude: "37.33270" },
        },
      ],
    },
    ...overrides,
  };
}

export function tmSearchResponse(events: unknown[], page = { size: 20, totalElements: events.length, totalPages: 1, number: 0 }) {
  return events.length ? { _embedded: { events }, page } : { page: { ...page, totalElements: 0, totalPages: 0 } };
}
