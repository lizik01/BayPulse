/** Tiny in-memory TTL cache to protect the Ticketmaster quota (5,000 calls/day, 5 req/sec). */
export class TtlCache<T> {
  private store = new Map<string, { value: T; expires: number }>();

  constructor(
    private ttlMs: number,
    private maxEntries = 500,
  ) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  clear(): void {
    this.store.clear();
  }

  set(key: string, value: T): void {
    // Re-inserting moves the key to the newest position; only evict when adding a new key.
    if (this.store.has(key)) this.store.delete(key);
    else if (this.store.size >= this.maxEntries) {
      // Map preserves insertion order, so the first key is the oldest.
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}
