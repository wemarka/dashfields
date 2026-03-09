/**
 * server/services/integrations/metaCache.ts
 *
 * In-memory TTL cache for Meta API responses.
 * Reduces rate-limit errors by caching expensive API calls
 * (adSets, ads, insights) for a configurable duration.
 *
 * Cache key format: `<procedure>:<userId>:<campaignId>:<datePreset>:<workspaceId>`
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MetaCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Purge expired entries every 10 minutes
    this.cleanupInterval = setInterval(() => this.purgeExpired(), 10 * 60 * 1000);
    // Allow Node.js to exit even if the interval is still running
    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }

  /** Build a deterministic cache key from parts */
  key(...parts: (string | number | undefined | null)[]): string {
    return parts.map(p => (p == null ? "_" : String(p))).join(":");
  }

  /** Return cached value if still valid, otherwise undefined */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  /** Store a value with a TTL in seconds */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  /**
   * Get-or-fetch helper.
   * Returns cached data if available; otherwise calls `fetcher()`,
   * caches the result, and returns it.
   */
  async getOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    const fresh = await fetcher();
    this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /** Invalidate a specific key (e.g. after a mutation) */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Invalidate all keys matching a prefix */
  invalidatePrefix(prefix: string): void {
    for (const k of Array.from(this.store.keys())) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }

  /** Remove all expired entries */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [k, v] of Array.from(this.store.entries())) {
      if (now > v.expiresAt) this.store.delete(k);
    }
  }

  /** Current number of cached entries (for diagnostics) */
  get size(): number {
    return this.store.size;
  }
}

// Singleton instance shared across all procedures
export const metaCache = new MetaCache();

// Re-export from centralized config for backward compatibility
export { SERVER_CACHE_TTL as CACHE_TTL } from "../cache/cacheConfig";
