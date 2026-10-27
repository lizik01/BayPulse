import axios, { AxiosError } from "axios";
import type { CityDirectory } from "../types/city";
import type { Event, SearchFilters, SearchResponse } from "../types/event";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5001/api",
  // Free-tier backends can take a while to wake up from a cold start.
  timeout: 30_000,
});

/** Turns any request failure into a message that's safe to show the user. */
export function errorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const apiMessage = (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (apiMessage) return apiMessage;
    if (err.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
    if (!err.response) return "Can't reach the BayPulse server. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

let directoryPromise: Promise<CityDirectory> | null = null;

export function getCityDirectory(): Promise<CityDirectory> {
  directoryPromise ??= api
    .get<CityDirectory>("/cities")
    .then((r) => r.data)
    .catch((err) => {
      directoryPromise = null; // allow retry
      throw err;
    });
  return directoryPromise;
}

export async function searchEvents(
  city: string,
  filters: SearchFilters,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const { data } = await api.get<SearchResponse>("/events/search", {
    params: { city, size: 24, ...filters },
    signal,
  });
  return data;
}

export async function getEvent(id: string, signal?: AbortSignal): Promise<Event> {
  const { data } = await api.get<{ event: Event }>(`/events/${encodeURIComponent(id)}`, { signal });
  return data.event;
}
