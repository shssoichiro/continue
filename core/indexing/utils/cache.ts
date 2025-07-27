import { SizeInfo } from "./sizeCalculation";

/**
 * Cache entry for storing size information with metadata.
 */
interface CacheEntry<T extends SizeInfo> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Cache key type for different index types.
 */
export type CacheKey = string;

/**
 * Configuration options for the cache.
 */
export interface CacheConfig {
  maxSize: number; // Maximum number of entries
  defaultTtl: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
}

/**
 * Default cache configuration.
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 100,
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
};

/**
 * In-memory cache for storing size calculation results.
 * Implements LRU eviction and TTL-based expiration.
 */
export class SizeCache {
  private cache = new Map<CacheKey, CacheEntry<SizeInfo>>();
  private accessOrder = new Map<CacheKey, number>(); // For LRU tracking
  private accessCounter = 0;
  private cleanupTimer?: NodeJS.Timeout;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Gets a cached entry if it exists and is not expired.
   * @param key - The cache key
   * @returns The cached data or undefined if not found/expired
   */
  get<T extends SizeInfo>(key: CacheKey): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return undefined;
    }

    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter);

    return entry.data as T;
  }

  /**
   * Sets a cache entry with optional TTL.
   * @param key - The cache key
   * @param data - The data to cache
   * @param ttl - Optional TTL override in milliseconds
   */
  set<T extends SizeInfo>(key: CacheKey, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTtl,
    };

    // If cache is at capacity, remove LRU entry
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry as CacheEntry<SizeInfo>);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  /**
   * Checks if a cache entry exists and is not expired.
   * @param key - The cache key
   * @returns Boolean indicating if the key exists and is valid
   */
  has(key: CacheKey): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Removes a specific cache entry.
   * @param key - The cache key to remove
   * @returns Boolean indicating if the key was found and removed
   */
  delete(key: CacheKey): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  /**
   * Clears all cache entries.
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  /**
   * Gets the current cache size.
   * @returns Number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Gets cache statistics.
   * @returns Object containing cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRatio: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map((e) => e.timestamp);

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRatio: this.calculateHitRatio(),
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  /**
   * Invalidates all cache entries for a specific type or pattern.
   * @param pattern - String pattern to match keys against
   */
  invalidatePattern(pattern: string): number {
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Cleanup expired entries.
   * @returns Number of entries cleaned up
   */
  cleanup(): number {
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Destroys the cache and cleanup timer.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * Checks if a cache entry is expired.
   * @param entry - The cache entry to check
   * @returns Boolean indicating if the entry is expired
   */
  private isExpired(entry: CacheEntry<SizeInfo>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evicts the least recently used entry.
   */
  private evictLRU(): void {
    let lruKey: string | undefined;
    let lruAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruAccess) {
        lruAccess = accessTime;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
    }
  }

  /**
   * Calculates the cache hit ratio.
   * Note: This is a simplified implementation for demonstration.
   * In a real scenario, you'd track hits and misses separately.
   */
  private calculateHitRatio(): number {
    // Simplified calculation - in practice, you'd track hits/misses
    return this.cache.size > 0 ? 0.8 : 0; // Placeholder value
  }

  /**
   * Starts the cleanup timer.
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // Don't prevent Node.js from exiting
    this.cleanupTimer.unref();
  }
}

/**
 * Global cache instance for size calculations.
 */
let globalSizeCache: SizeCache | undefined;

/**
 * Gets the global size cache instance, creating it if it doesn't exist.
 * @param config - Optional cache configuration
 * @returns The global cache instance
 */
export function getSizeCache(config?: Partial<CacheConfig>): SizeCache {
  if (!globalSizeCache) {
    globalSizeCache = new SizeCache(config);
  }
  return globalSizeCache;
}

/**
 * Destroys the global cache instance.
 */
export function destroySizeCache(): void {
  if (globalSizeCache) {
    globalSizeCache.destroy();
    globalSizeCache = undefined;
  }
}

/**
 * Cache key generators for different index types.
 */
export const CacheKeys = {
  /**
   * Generates a cache key for docs index size.
   * @param startUrl - The documentation start URL
   * @returns Cache key string
   */
  docsSize: (startUrl: string): CacheKey => `docs:${startUrl}`,

  /**
   * Generates a cache key for codebase index size.
   * @param workspaceDir - The workspace directory path
   * @returns Cache key string
   */
  codebaseSize: (workspaceDir: string): CacheKey => `codebase:${workspaceDir}`,

  /**
   * Generates a cache key for any index type.
   * @param type - The index type
   * @param identifier - The unique identifier
   * @returns Cache key string
   */
  custom: (type: string, identifier: string): CacheKey =>
    `${type}:${identifier}`,
};

/**
 * Utility function to get cached size or calculate and cache it.
 * @param key - Cache key
 * @param calculator - Function to calculate the size if not cached
 * @param ttl - Optional TTL override
 * @returns Promise resolving to size info
 */
export async function getCachedOrCalculate<T extends SizeInfo>(
  key: CacheKey,
  calculator: () => Promise<T>,
  ttl?: number,
): Promise<T> {
  const cache = getSizeCache();

  // Try to get from cache first
  const cached = cache.get<T>(key);
  if (cached) {
    return cached;
  }

  // Calculate and cache the result
  try {
    const result = await calculator();
    cache.set(key, result, ttl);
    return result;
  } catch (error) {
    console.error(`Failed to calculate size for key ${key}:`, error);
    // Return empty result on error
    return { size: 0, count: 0 } as T;
  }
}

/**
 * Invalidates cache entries for a specific workspace or documentation site.
 * @param identifier - The workspace path or docs URL
 */
export function invalidateIndexCache(identifier: string): void {
  const cache = getSizeCache();
  cache.invalidatePattern(identifier);
}
