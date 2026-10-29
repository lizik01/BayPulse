import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "../src/utils/cache";

describe("TtlCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns stored values until they expire", () => {
    const cache = new TtlCache<string>(1000);
    cache.set("a", "1");
    vi.advanceTimersByTime(999);
    expect(cache.get("a")).toBe("1");
    vi.advanceTimersByTime(2);
    expect(cache.get("a")).toBeUndefined();
  });

  it("returns undefined for unknown keys", () => {
    expect(new TtlCache<string>(1000).get("missing")).toBeUndefined();
  });

  it("evicts the oldest entry when full", () => {
    const cache = new TtlCache<number>(60_000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("overwriting a key refreshes its value and expiry", () => {
    const cache = new TtlCache<number>(1000);
    cache.set("a", 1);
    vi.advanceTimersByTime(800);
    cache.set("a", 2);
    vi.advanceTimersByTime(800);
    expect(cache.get("a")).toBe(2);
  });

  it("overwriting a key when full doesn't evict a different key", () => {
    const cache = new TtlCache<number>(60_000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("b", 20);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(20);
  });

  it("clear() removes everything", () => {
    const cache = new TtlCache<number>(1000);
    cache.set("a", 1);
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
  });
});
