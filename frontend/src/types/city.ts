export interface City {
  id: string;
  name: string;
  region: string;
  state: string;
  lat: number;
  lng: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface CityDirectory {
  regions: string[];
  cities: City[];
  categories: Category[];
}
