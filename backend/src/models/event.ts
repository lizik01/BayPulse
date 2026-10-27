/** Normalized event shape returned to the frontend. */
export interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
}

export interface PriceRange {
  min: number | null;
  max: number | null;
  currency: string;
}

export interface Event {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  /** Local date, YYYY-MM-DD. */
  date: string | null;
  /** Local time, HH:mm:ss. */
  time: string | null;
  /** UTC ISO timestamp, if Ticketmaster provides one. */
  dateTime: string | null;
  timezone: string | null;
  status: string | null;
  category: string | null;
  genre: string | null;
  description: string | null;
  pleaseNote: string | null;
  priceRange: PriceRange | null;
  venue: Venue | null;
}

export interface PageInfo {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SearchResult {
  events: Event[];
  page: PageInfo;
}
