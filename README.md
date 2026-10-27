# BayPulse — Bay Area Event Finder

**Discover events across the San Francisco Bay Area, one city at a time.**

BayPulse is a full-stack web app for finding local events around the San Francisco Bay Area. You don't need GPS or a distance search: pick a city, browse upcoming events, filter them, and see where they are on an interactive map.

It covers concerts, arts and culture, sports, festivals and other local events, from San Francisco to San Jose.

## Features

### City-based event discovery
- Browse events by city, with cities grouped into regions (Peninsula, East Bay, South Bay).
- Search a city without granting browser location access.
- Optionally widen a search to 5, 10 or 25 miles around the city center.

### Search and filters
- Keyword search (event, artist, team).
- Category filters: Music, Sports, Arts & Theatre, Film, Family, Miscellaneous.
- Date presets (Today, This weekend, Next 7 days, This month) or a custom date range. Dates use Bay Area local time.
- Every filter is stored in the URL, so a search can be bookmarked or shared and the browser's back button works.
- Clear loading, error, empty-result and invalid-date states, with a retry button.

### Interactive map
- Leaflet + OpenStreetMap, with one marker per venue (the number on a marker is how many events are there).
- Click a card to fly the map to its venue; click a marker to highlight its card.
- Events with no coordinates still appear in the list.

### Event details
- Name, date and time, venue, address, price range, description and notes.
- A link to buy official tickets on Ticketmaster, plus Google Maps directions.

### Responsive design
- Two columns on desktop (results and a sticky map). On phones, a List/Map toggle.
- Light and dark themes follow the operating system setting.

*Events, venue details, prices and coverage all depend on what Ticketmaster returns.*

## Technology stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript, Vite, React Router, Leaflet / react-leaflet, Axios, date-fns |
| Backend | Node.js + Express, TypeScript, native `fetch`, CORS, dotenv |
| Data | Ticketmaster Discovery API v2 |
| Deploy | Vercel (frontend), Render (backend) |

## Supported cities

| San Francisco and the Peninsula | East Bay | South Bay |
|---|---|---|
| San Francisco | Oakland | Mountain View |
| Daly City | Berkeley | Sunnyvale |
| South San Francisco | Alameda | Santa Clara |
| San Mateo | Hayward | San Jose |
| Redwood City | Fremont | Milpitas |
| Palo Alto | Walnut Creek | Cupertino |

To add a city, add one entry to [`backend/src/config/cities.ts`](backend/src/config/cities.ts). No new endpoint is needed. Being listed doesn't guarantee Ticketmaster has events there; the empty state then suggests widening the search radius.

## How it works

1. **Choose a city** from the directory on the home page.
2. **Set search criteria**: keyword, category, dates and area.
3. The frontend calls `GET /api/events/search` on the Express backend.
4. The backend validates the parameters and maps the city to a Ticketmaster query. By default that's the city name plus `stateCode=CA`; with a radius, it's the city-center lat/long plus `radius`.
5. The backend **normalizes** the Ticketmaster response into a small, stable `Event` shape and caches it in memory for 5 minutes to protect the API quota.
6. The frontend renders event cards and map markers.
7. **Open an event** to see its details, ticket link and directions.

```text
User ─► React + TS frontend ─HTTP─► Express API ─► Ticketmaster Discovery API
                ▲                        │
                └──── normalized JSON ◄──┘  (validation · caching · error mapping)
```

There is no database yet. All event data comes live from Ticketmaster.

## Project structure

```text
BayPulse/
├── backend/
│   ├── src/
│   │   ├── config/cities.ts            # city directory + category mapping
│   │   ├── controllers/eventController.ts  # parameter validation
│   │   ├── routes/eventRoutes.ts
│   │   ├── services/ticketmasterService.ts # Ticketmaster calls + normalization
│   │   ├── models/event.ts             # normalized Event type
│   │   ├── middleware/errorHandler.ts  # AppError + consistent JSON errors
│   │   ├── utils/cache.ts              # in-memory TTL cache
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  CitySelector, SearchBar, FilterPanel, EventCard, EventMap, StatusMessage
│   │   ├── pages/       HomePage, CityEventsPage, EventDetailsPage
│   │   ├── services/eventService.ts
│   │   ├── types/       event.ts, city.ts
│   │   ├── utils/dateUtils.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vercel.json      # SPA rewrites for client-side routes
│   ├── .env.example
│   └── package.json
└── README.md
```

## API

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service status and whether the API key is configured |
| GET | `/api/cities` | `{ regions, cities, categories }` |
| GET | `/api/events/search` | Search events in a city |
| GET | `/api/events/:id` | One event by Ticketmaster ID |

### `GET /api/events/search`

| Param | Required | Notes |
|---|---|---|
| `city` | ✓ | City id, e.g. `san-jose` |
| `keyword` | | ≤ 100 chars |
| `category` | | `music`, `sports`, `arts`, `film`, `family`, `misc` |
| `startDate` / `endDate` | | `YYYY-MM-DD`, Bay Area local days. Defaults to "from now". |
| `radius` | | 1–50 miles around the city center. Omit it to search by city name. |
| `page` | | 0-based. Ticketmaster caps `page × size` at 1000. |
| `size` | | 1–50 (default 20) |

```http
GET /api/events/search?city=san-jose&keyword=music&startDate=2026-11-01&endDate=2026-11-30
```

Response:

```json
{
  "city": { "id": "san-jose", "name": "San Jose", "region": "South Bay", "state": "CA", "lat": 37.3382, "lng": -121.8863 },
  "searchMode": { "type": "city" },
  "events": [{ "id": "…", "name": "…", "date": "2026-11-07", "time": "19:30:00", "venue": { "name": "…", "lat": 37.33, "lng": -121.9 }, "…": "…" }],
  "page": { "number": 0, "size": 20, "totalElements": 57, "totalPages": 3 }
}
```

Errors always look like `{ "error": { "code": "UNKNOWN_CITY", "message": "…" } }`. The API key and upstream URLs never appear in responses.

## Getting started

### Prerequisites
- Node.js 18+ and npm
- A [Ticketmaster Developer](https://developer.ticketmaster.com/) API key

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then put your TICKETMASTER_API_KEY in .env
npm run dev            # http://localhost:5001
```

> The default port is **5001** because macOS uses port 5000 for AirPlay Receiver.

### 2. Frontend (in a second terminal)

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5001/api
npm run dev            # http://localhost:5173
```

### Scripts

| | backend | frontend |
|---|---|---|
| dev server | `npm run dev` (tsx watch) | `npm run dev` |
| production build | `npm run build` → `dist/` | `npm run build` → `dist/` |
| run build | `npm start` | `npm run preview` |

## Environment variables

**Backend**: `PORT` (default 5001), `TICKETMASTER_API_KEY`, `FRONTEND_URL` (allowed CORS origins, comma-separated).
**Frontend**: `VITE_API_URL` (backend base URL, ending in `/api`).

The Ticketmaster key lives only on the backend. Never put it in a `VITE_` variable, because those are bundled into the browser JavaScript. `.env` files are gitignored.

## Deployment

### Backend on Render
The repo includes a [`render.yaml`](render.yaml) Blueprint.
1. In Render, choose **New → Blueprint** and connect this repository. Render reads `render.yaml` and creates the `baypulse-api` web service (root `backend`, build `npm ci --include=dev && npm run build`, start `npm start`, health check `/health`).
2. When prompted, enter `TICKETMASTER_API_KEY` and `FRONTEND_URL` (your Vercel URL, e.g. `https://baypulse.vercel.app`; comma-separate several). Render provides `PORT` itself.
3. Check `https://<service>.onrender.com/health`.

### Frontend on Vercel
1. Import the repo with root directory `frontend` (framework preset: Vite).
2. Set `VITE_API_URL=https://<service>.onrender.com/api`.
3. Deploy. `vercel.json` rewrites every path to `index.html`, so links like `/city/oakland` work on refresh.

Render's free tier sleeps when idle, so the first request after a while can take 30+ seconds. The frontend allows 30 s before showing a retry message.

## Future enhancements

- [ ] North Bay (Sausalito, San Rafael, Novato) and more of the nine counties
- [ ] Region-level and multi-city searches; event counts per city
- [ ] Marker clustering for dense results
- [ ] Favorites and saved lists (would need auth and a database)
- [ ] Calendar export and reminders
- [ ] More event providers
- [ ] Automated tests (API validation, normalization, UI flows)
- [ ] Accessibility audit

## License

A learning and portfolio project. Add an explicit license before distributing.

## Acknowledgments

[Ticketmaster Developer Portal](https://developer.ticketmaster.com/) · [Leaflet](https://leafletjs.com/) · [OpenStreetMap](https://www.openstreetmap.org/) · [React](https://react.dev/) · [Express](https://expressjs.com/) · Inspired by [AngePort/LookOut](https://github.com/AngePort/LookOut)
