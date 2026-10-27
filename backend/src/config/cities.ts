export type Region =
  | "San Francisco and the Peninsula"
  | "East Bay"
  | "South Bay";

export interface City {
  id: string;
  name: string;
  region: Region;
  state: string;
  /** City center, used to center the map and for radius searches. */
  lat: number;
  lng: number;
}

export const REGIONS: Region[] = [
  "San Francisco and the Peninsula",
  "East Bay",
  "South Bay",
];

export const cities: City[] = [
  // San Francisco and the Peninsula
  { id: "san-francisco", name: "San Francisco", region: "San Francisco and the Peninsula", state: "CA", lat: 37.7749, lng: -122.4194 },
  { id: "daly-city", name: "Daly City", region: "San Francisco and the Peninsula", state: "CA", lat: 37.6879, lng: -122.4702 },
  { id: "south-san-francisco", name: "South San Francisco", region: "San Francisco and the Peninsula", state: "CA", lat: 37.6547, lng: -122.4077 },
  { id: "san-mateo", name: "San Mateo", region: "San Francisco and the Peninsula", state: "CA", lat: 37.563, lng: -122.3255 },
  { id: "redwood-city", name: "Redwood City", region: "San Francisco and the Peninsula", state: "CA", lat: 37.4852, lng: -122.2364 },
  { id: "palo-alto", name: "Palo Alto", region: "San Francisco and the Peninsula", state: "CA", lat: 37.4419, lng: -122.143 },

  // East Bay
  { id: "oakland", name: "Oakland", region: "East Bay", state: "CA", lat: 37.8044, lng: -122.2712 },
  { id: "berkeley", name: "Berkeley", region: "East Bay", state: "CA", lat: 37.8716, lng: -122.2727 },
  { id: "alameda", name: "Alameda", region: "East Bay", state: "CA", lat: 37.7652, lng: -122.2416 },
  { id: "hayward", name: "Hayward", region: "East Bay", state: "CA", lat: 37.6688, lng: -122.0808 },
  { id: "fremont", name: "Fremont", region: "East Bay", state: "CA", lat: 37.5485, lng: -121.9886 },
  { id: "walnut-creek", name: "Walnut Creek", region: "East Bay", state: "CA", lat: 37.9101, lng: -122.0652 },

  // South Bay
  { id: "mountain-view", name: "Mountain View", region: "South Bay", state: "CA", lat: 37.3861, lng: -122.0839 },
  { id: "sunnyvale", name: "Sunnyvale", region: "South Bay", state: "CA", lat: 37.3688, lng: -122.0363 },
  { id: "santa-clara", name: "Santa Clara", region: "South Bay", state: "CA", lat: 37.3541, lng: -121.9552 },
  { id: "san-jose", name: "San Jose", region: "South Bay", state: "CA", lat: 37.3382, lng: -121.8863 },
  { id: "milpitas", name: "Milpitas", region: "South Bay", state: "CA", lat: 37.4323, lng: -121.8996 },
  { id: "cupertino", name: "Cupertino", region: "South Bay", state: "CA", lat: 37.323, lng: -122.0322 },
];

export function findCity(id: string): City | undefined {
  return cities.find((c) => c.id === id);
}

/** Categories the UI can filter on, mapped to Ticketmaster segment names. */
export const categories = [
  { id: "music", name: "Music", segment: "Music" },
  { id: "sports", name: "Sports", segment: "Sports" },
  { id: "arts", name: "Arts & Theatre", segment: "Arts & Theatre" },
  { id: "film", name: "Film", segment: "Film" },
  { id: "family", name: "Family", segment: "Family" },
  { id: "misc", name: "Miscellaneous", segment: "Miscellaneous" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export function findCategory(id: string) {
  return categories.find((c) => c.id === id);
}
