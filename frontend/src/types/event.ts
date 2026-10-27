import type { City } from "./city";

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
  date: string | null;
  time: string | null;
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

export interface SearchResponse {
  city: City;
  searchMode: { type: "city" } | { type: "radius"; miles: number };
  events: Event[];
  page: PageInfo;
}

export interface SearchFilters {
  keyword?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  radius?: number;
  page?: number;
}
