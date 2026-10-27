import { addDays, endOfMonth, format, getDay, parseISO } from "date-fns";
import type { Event, PriceRange, Venue } from "../types/event";

export const toIsoDate = (d: Date) => format(d, "yyyy-MM-dd");

/** "Sat, Nov 8" */
export function formatShortDate(date: string | null): string {
  if (!date) return "Date TBA";
  return format(parseISO(date), "EEE, MMM d");
}

/** "Saturday, November 8, 2026" */
export function formatLongDate(date: string | null): string {
  if (!date) return "Date to be announced";
  return format(parseISO(date), "EEEE, MMMM d, yyyy");
}

/** "7:30 PM" from "19:30:00" */
export function formatTime(time: string | null): string | null {
  if (!time) return null;
  return format(parseISO(`2000-01-01T${time}`), "h:mm a");
}

export function formatEventWhen(event: Event, long = false): string {
  const date = long ? formatLongDate(event.date) : formatShortDate(event.date);
  const time = formatTime(event.time);
  return time ? `${date} · ${time}` : date;
}

export function formatPrice(p: PriceRange | null): string | null {
  if (!p || (p.min == null && p.max == null)) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(n);
  if (p.min != null && p.max != null && p.min !== p.max) return `${fmt(p.min)} – ${fmt(p.max)}`;
  return fmt((p.min ?? p.max)!);
}

export function formatAddress(v: Venue): string | null {
  const line2 = [v.city, [v.state, v.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [v.address, line2].filter(Boolean).join(", ") || null;
}

export function directionsUrl(v: Venue): string {
  const destination =
    v.lat != null && v.lng != null ? `${v.lat},${v.lng}` : [v.name, formatAddress(v)].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export interface DatePreset {
  id: string;
  label: string;
  range: () => { startDate: string; endDate: string };
}

export const DATE_PRESETS: DatePreset[] = [
  {
    id: "today",
    label: "Today",
    range: () => ({ startDate: toIsoDate(new Date()), endDate: toIsoDate(new Date()) }),
  },
  {
    id: "weekend",
    label: "This weekend",
    // Friday through Sunday; if it's already the weekend, from today through Sunday.
    range: () => {
      const now = new Date();
      const day = getDay(now); // 0 = Sunday … 6 = Saturday
      const start = day === 0 || day >= 5 ? now : addDays(now, 5 - day);
      const sunday = day === 0 ? now : addDays(now, 7 - day);
      return { startDate: toIsoDate(start), endDate: toIsoDate(sunday) };
    },
  },
  {
    id: "week",
    label: "Next 7 days",
    range: () => ({ startDate: toIsoDate(new Date()), endDate: toIsoDate(addDays(new Date(), 6)) }),
  },
  {
    id: "month",
    label: "This month",
    range: () => ({ startDate: toIsoDate(new Date()), endDate: toIsoDate(endOfMonth(new Date())) }),
  },
];
