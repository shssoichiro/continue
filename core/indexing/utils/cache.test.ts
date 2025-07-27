import {
  CacheKeys,
  SizeCache,
  destroySizeCache,
  getCachedOrCalculate,
  getSizeCache,
  invalidateIndexCache,
} from "./cache";
import { SizeInfo } from "./sizeCalculation";

describe("SizeCache", () => {
  let cache: SizeCache;

  beforeEach(() => {
    cache = new SizeCache({
      maxSize: 3,
      defaultTtl: 1000, // 1 second for testing
      cleanupInterval: 100, // 100ms for testing
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe("basic operations", () => {
    test("should store and retrieve values", () => {
      const sizeInfo: SizeInfo = { size: 1024, count: 5 };

      cache.set("test-key", sizeInfo);
      const retrieved = cache.get("test-key");

      expect(retrieved).toEqual(sizeInfo);
    });

    test("should return undefined for non-existent keys", () => {
      const result = cache.get("non-existent");
      expect(result).toBeUndefined();
    });

    test("should check if key exists", () => {
      const sizeInfo: SizeInfo = { size: 1024, count: 5 };

      expect(cache.has("test-key")).toBe(false);

      cache.set("test-key", sizeInfo);
      expect(cache.has("test-key")).toBe(true);
    });

    test("should delete entries", () => {
      const sizeInfo: SizeInfo = { size: 1024, count: 5 };

      cache.set("test-key", sizeInfo);
      expect(cache.has("test-key")).toBe(true);

      const deleted = cache.delete("test-key");
      expect(deleted).toBe(true);
      expect(cache.has("test-key")).toBe(false);

      const deletedAgain = cache.delete("test-key");
      expect(deletedAgain).toBe(false);
    });

    test("should clear all entries", () => {
      cache.set("key1", { size: 1024, count: 5 });
      cache.set("key2", { size: 2048, count: 10 });

      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(false);
    });
  });

  describe("TTL (Time To Live)", () => {
    test("should expire entries after TTL", async () => {
      const sizeInfo: SizeInfo = { size: 1024, count: 5 };

      cache.set("test-key", sizeInfo, 50); // 50ms TTL
      expect(cache.has("test-key")).toBe(true);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.has("test-key")).toBe(false);
      expect(cache.get("test-key")).toBeUndefined();
    });

    test("should use default TTL when none specified", async () => {
      const sizeInfo: SizeInfo = { size: 1024, count: 5 };

      cache.set("test-key", sizeInfo);
      expect(cache.has("test-key")).toBe(true);

      // Should still be valid before default TTL
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(cache.has("test-key")).toBe(true);
    });

    test("should clean up expired entries automatically", async () => {
      const sizeInfo: SizeInfo = { size: 1024, count: 5 };

      cache.set("test-key", sizeInfo, 50); // 50ms TTL
      expect(cache.size()).toBe(1);

      // Wait for cleanup cycle
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.size()).toBe(0);
    });
  });

  describe("LRU eviction", () => {
    test("should evict least recently used entries when at capacity", () => {
      // Fill cache to capacity
      cache.set("key1", { size: 1024, count: 1 });
      cache.set("key2", { size: 2048, count: 2 });
      cache.set("key3", { size: 3072, count: 3 });

      expect(cache.size()).toBe(3);

      // Access key1 to make it more recently used
      cache.get("key1");

      // Add another entry, should evict key2 (least recently used)
      cache.set("key4", { size: 4096, count: 4 });

      expect(cache.size()).toBe(3);
      expect(cache.has("key1")).toBe(true); // Most recently accessed
      expect(cache.has("key2")).toBe(false); // Should be evicted
      expect(cache.has("key3")).toBe(true);
      expect(cache.has("key4")).toBe(true); // Just added
    });

    test("should update access order on get operations", () => {
      cache.set("key1", { size: 1024, count: 1 });
      cache.set("key2", { size: 2048, count: 2 });
      cache.set("key3", { size: 3072, count: 3 });

      // Access key1 to make it most recently used
      cache.get("key1");

      // Add another entry, should evict key2
      cache.set("key4", { size: 4096, count: 4 });

      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(false);
    });
  });

  describe("statistics and monitoring", () => {
    test("should provide cache statistics", () => {
      cache.set("key1", { size: 1024, count: 1 });
      cache.set("key2", { size: 2048, count: 2 });

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.oldestEntry).toBeGreaterThan(0);
      expect(stats.newestEntry).toBeGreaterThan(0);
      expect(stats.newestEntry).toBeGreaterThanOrEqual(stats.oldestEntry);
    });

    test("should handle empty cache statistics", () => {
      const stats = cache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(3);
      expect(stats.oldestEntry).toBe(0);
      expect(stats.newestEntry).toBe(0);
    });
  });

  describe("pattern invalidation", () => {
    test("should invalidate entries matching pattern", () => {
      cache.set("docs:site1", { size: 1024, count: 1 });
      cache.set("docs:site2", { size: 2048, count: 2 });
      cache.set("codebase:project1", { size: 3072, count: 3 });

      const invalidated = cache.invalidatePattern("docs:");

      expect(invalidated).toBe(2);
      expect(cache.has("docs:site1")).toBe(false);
      expect(cache.has("docs:site2")).toBe(false);
      expect(cache.has("codebase:project1")).toBe(true);
    });

    test("should return zero when no entries match pattern", () => {
      cache.set("key1", { size: 1024, count: 1 });

      const invalidated = cache.invalidatePattern("nonexistent");

      expect(invalidated).toBe(0);
      expect(cache.has("key1")).toBe(true);
    });
  });

  describe("manual cleanup", () => {
    test("should clean up expired entries manually", async () => {
      cache.set("key1", { size: 1024, count: 1 }, 50); // 50ms TTL
      cache.set("key2", { size: 2048, count: 2 }, 1000); // 1s TTL

      expect(cache.size()).toBe(2);

      // Wait for first entry to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      const cleaned = cache.cleanup();

      expect(cleaned).toBe(1);
      expect(cache.size()).toBe(1);
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(true);
    });
  });
});

describe("global cache functions", () => {
  afterEach(() => {
    destroySizeCache();
  });

  test("should create and return global cache instance", () => {
    const cache1 = getSizeCache();
    const cache2 = getSizeCache();

    expect(cache1).toBe(cache2); // Should be the same instance
  });

  test("should destroy global cache instance", () => {
    const cache = getSizeCache();
    cache.set("test", { size: 1024, count: 1 });

    expect(cache.has("test")).toBe(true);

    destroySizeCache();

    // Getting cache again should create a new instance
    const newCache = getSizeCache();
    expect(newCache.has("test")).toBe(false);
  });
});

describe("cache key generators", () => {
  test("should generate docs cache keys", () => {
    const key = CacheKeys.docsSize("https://example.com/docs");
    expect(key).toBe("docs:https://example.com/docs");
  });

  test("should generate codebase cache keys", () => {
    const key = CacheKeys.codebaseSize("/workspace/project");
    expect(key).toBe("codebase:/workspace/project");
  });

  test("should generate custom cache keys", () => {
    const key = CacheKeys.custom("custom", "identifier");
    expect(key).toBe("custom:identifier");
  });
});

describe("getCachedOrCalculate", () => {
  afterEach(() => {
    destroySizeCache();
  });

  test("should return cached value if available", async () => {
    const cache = getSizeCache();
    const cachedValue: SizeInfo = { size: 1024, count: 5 };
    const key = "test-key";

    cache.set(key, cachedValue);

    const calculator = jest.fn();
    const result = await getCachedOrCalculate(key, calculator);

    expect(result).toEqual(cachedValue);
    expect(calculator).not.toHaveBeenCalled();
  });

  test("should calculate and cache value if not available", async () => {
    const calculatedValue: SizeInfo = { size: 2048, count: 10 };
    const key = "test-key";

    const calculator = jest.fn().mockResolvedValue(calculatedValue);
    const result = await getCachedOrCalculate(key, calculator);

    expect(result).toEqual(calculatedValue);
    expect(calculator).toHaveBeenCalledTimes(1);

    // Should now be cached
    const cache = getSizeCache();
    expect(cache.has(key)).toBe(true);
    expect(cache.get(key)).toEqual(calculatedValue);
  });

  test("should handle calculator errors gracefully", async () => {
    const key = "test-key";
    const calculator = jest
      .fn()
      .mockRejectedValue(new Error("Calculation failed"));

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await getCachedOrCalculate(key, calculator);

    expect(result).toEqual({ size: 0, count: 0 });
    expect(calculator).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("should respect custom TTL", async () => {
    const calculatedValue: SizeInfo = { size: 2048, count: 10 };
    const key = "test-key";
    const customTtl = 500;

    const calculator = jest.fn().mockResolvedValue(calculatedValue);
    await getCachedOrCalculate(key, calculator, customTtl);

    const cache = getSizeCache();
    expect(cache.has(key)).toBe(true);

    // Should expire after custom TTL
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(cache.has(key)).toBe(false);
  });
});

describe("invalidateIndexCache", () => {
  afterEach(() => {
    destroySizeCache();
  });

  test("should invalidate cache entries for specific identifier", () => {
    const cache = getSizeCache();

    cache.set("docs:https://site1.com", { size: 1024, count: 1 });
    cache.set("docs:https://site2.com", { size: 2048, count: 2 });
    cache.set("codebase:/project1", { size: 3072, count: 3 });
    cache.set("codebase:/project2", { size: 4096, count: 4 });

    invalidateIndexCache("https://site1.com");

    expect(cache.has("docs:https://site1.com")).toBe(false);
    expect(cache.has("docs:https://site2.com")).toBe(true);
    expect(cache.has("codebase:/project1")).toBe(true);
    expect(cache.has("codebase:/project2")).toBe(true);
  });

  test("should handle non-existent identifiers gracefully", () => {
    const cache = getSizeCache();
    cache.set("test-key", { size: 1024, count: 1 });

    // Should not throw or affect existing entries
    expect(() => invalidateIndexCache("nonexistent")).not.toThrow();
    expect(cache.has("test-key")).toBe(true);
  });
});

describe("cache integration tests", () => {
  afterEach(() => {
    destroySizeCache();
  });

  test("should handle realistic caching scenario", async () => {
    const docsUrl = "https://example.com/docs";
    const workspacePath = "/workspace/project";

    // Simulate getting docs size
    const docsCalculator = jest
      .fn()
      .mockResolvedValue({ size: 1048576, count: 25 });
    const docsKey = CacheKeys.docsSize(docsUrl);

    const docsResult1 = await getCachedOrCalculate(docsKey, docsCalculator);
    expect(docsResult1).toEqual({ size: 1048576, count: 25 });
    expect(docsCalculator).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const docsResult2 = await getCachedOrCalculate(docsKey, docsCalculator);
    expect(docsResult2).toEqual({ size: 1048576, count: 25 });
    expect(docsCalculator).toHaveBeenCalledTimes(1); // Still only called once

    // Simulate getting codebase size
    const codebaseCalculator = jest
      .fn()
      .mockResolvedValue({ size: 2097152, count: 150 });
    const codebaseKey = CacheKeys.codebaseSize(workspacePath);

    const codebaseResult = await getCachedOrCalculate(
      codebaseKey,
      codebaseCalculator,
    );
    expect(codebaseResult).toEqual({ size: 2097152, count: 150 });
    expect(codebaseCalculator).toHaveBeenCalledTimes(1);

    // Invalidate docs cache
    invalidateIndexCache(docsUrl);

    // Docs should be recalculated, codebase should still be cached
    const docsResult3 = await getCachedOrCalculate(docsKey, docsCalculator);
    expect(docsCalculator).toHaveBeenCalledTimes(2); // Called again

    const codebaseResult2 = await getCachedOrCalculate(
      codebaseKey,
      codebaseCalculator,
    );
    expect(codebaseCalculator).toHaveBeenCalledTimes(1); // Still cached
  });
});
