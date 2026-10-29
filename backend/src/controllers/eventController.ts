import type { NextFunction, Request, Response } from "express";
import { categories, cities, findCategory, findCity, REGIONS } from "../config/cities";
import { AppError } from "../middleware/errorHandler";
import { getEventById, searchEvents } from "../services/ticketmasterService";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SIZE = 50;
// Ticketmaster refuses deep paging past page * size >= 1000.
const MAX_DEPTH = 1000;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function int(v: unknown, fallback: number, name: string, min: number, max: number): number {
  const s = str(v);
  if (s === undefined) return fallback;
  // Plain decimal digits only: Number() would also accept "0x10", "1e1" and "".
  const n = /^-?\d+$/.test(s) ? Number(s) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new AppError(400, "INVALID_PARAM", `"${name}" must be an integer between ${min} and ${max}`);
  }
  return n;
}

function date(v: unknown, name: string): string | undefined {
  const s = str(v);
  if (s === undefined) return undefined;
  // Date.parse rolls impossible dates over ("2026-02-30" -> Mar 2), so require a round trip.
  const parsed = DATE_RE.test(s) ? new Date(`${s}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== s) {
    throw new AppError(400, "INVALID_DATE", `"${name}" must be a date in YYYY-MM-DD format`);
  }
  return s;
}

export function getCities(_req: Request, res: Response) {
  res.json({
    regions: REGIONS,
    cities,
    categories: categories.map(({ id, name }) => ({ id, name })),
  });
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const cityId = str(req.query.city);
    if (!cityId) throw new AppError(400, "MISSING_CITY", 'The "city" query parameter is required');
    const city = findCity(cityId);
    if (!city) throw new AppError(400, "UNKNOWN_CITY", `Unsupported city "${cityId}"`);

    const categoryId = str(req.query.category);
    const category = categoryId ? findCategory(categoryId) : undefined;
    if (categoryId && !category) {
      throw new AppError(400, "UNKNOWN_CATEGORY", `Unsupported category "${categoryId}"`);
    }

    const startDate = date(req.query.startDate, "startDate");
    const endDate = date(req.query.endDate, "endDate");
    if (startDate && endDate && startDate > endDate) {
      throw new AppError(400, "INVALID_DATE_RANGE", "startDate must be on or before endDate");
    }

    const keyword = str(req.query.keyword);
    if (keyword && keyword.length > 100) {
      throw new AppError(400, "INVALID_PARAM", "keyword is too long");
    }

    const size = int(req.query.size, 20, "size", 1, MAX_SIZE);
    const page = int(req.query.page, 0, "page", 0, Math.floor(MAX_DEPTH / size) - 1);
    const radius = int(req.query.radius, 0, "radius", 0, 50) || undefined;

    const result = await searchEvents({
      city,
      keyword,
      segment: category?.segment,
      startDate,
      endDate,
      radius,
      page,
      size,
    });

    res.json({ city, searchMode: radius ? { type: "radius", miles: radius } : { type: "city" }, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    if (!/^[\w-]{1,64}$/.test(id)) throw new AppError(400, "INVALID_ID", "Invalid event id");
    res.json({ event: await getEventById(id) });
  } catch (err) {
    next(err);
  }
}
