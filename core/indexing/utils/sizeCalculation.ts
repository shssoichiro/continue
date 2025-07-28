import * as fs from "fs";
import * as path from "path";
import { getDocsSqlitePath, getLanceDbPath } from "../../util/paths";

export interface SizeInfo {
  size: number; // Size in bytes
  count: number; // File count or page count
}

export interface DocsIndexSize extends SizeInfo {
  count: number; // Page count
}

export interface CodebaseIndexSize extends SizeInfo {
  count: number; // File count
}

interface CacheEntry {
  data: SizeInfo;
  timestamp: number;
}

/**
 * Cache for storing calculated size data to avoid recalculation
 * Key format: "docs:{startUrl}:{embeddingId}" or "codebase:{workspaceDir}"
 */
const sizeCache = new Map<string, CacheEntry>();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Maximum cache size to prevent memory issues
const MAX_CACHE_SIZE = 100;

/**
 * Recursively calculates the total size of a directory in bytes.
 * @param dirPath - Path to the directory
 * @returns Promise resolving to size in bytes
 */
async function calculateDirectorySize(dirPath: string): Promise<number> {
  try {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const stats = await fs.promises.stat(dirPath);
    if (!stats.isDirectory()) {
      return stats.size;
    }

    let totalSize = 0;
    const items = await fs.promises.readdir(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        const itemStats = await fs.promises.stat(fullPath);
        if (itemStats.isDirectory()) {
          totalSize += await calculateDirectorySize(fullPath);
        } else {
          totalSize += itemStats.size;
        }
      } catch (error) {
        // Skip files that can't be accessed due to permissions or other issues
        console.warn(`Failed to stat ${fullPath}:`, error);
        continue;
      }
    }

    return totalSize;
  } catch (error) {
    console.error(`Failed to calculate directory size for ${dirPath}:`, error);
    return 0;
  }
}

/**
 * Counts the number of files in a directory recursively.
 * @param dirPath - Path to the directory
 * @returns Promise resolving to file count
 */
async function countFilesInDirectory(dirPath: string): Promise<number> {
  try {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const stats = await fs.promises.stat(dirPath);
    if (!stats.isDirectory()) {
      return 1;
    }

    let fileCount = 0;
    const items = await fs.promises.readdir(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        const itemStats = await fs.promises.stat(fullPath);
        if (itemStats.isDirectory()) {
          fileCount += await countFilesInDirectory(fullPath);
        } else {
          fileCount += 1;
        }
      } catch (error) {
        // Skip files that can't be accessed
        console.warn(`Failed to stat ${fullPath}:`, error);
        continue;
      }
    }

    return fileCount;
  } catch (error) {
    console.error(`Failed to count files in ${dirPath}:`, error);
    return 0;
  }
}

/**
 * LRU eviction when cache gets too large
 */
function evictOldestCacheEntry() {
  if (sizeCache.size <= MAX_CACHE_SIZE) {
    return;
  }

  let oldestKey = "";
  let oldestTimestamp = Date.now();

  for (const [key, entry] of sizeCache.entries()) {
    if (entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    sizeCache.delete(oldestKey);
  }
}

/**
 * Get cached size data if still valid
 */
function getCachedSize(key: string): SizeInfo | null {
  const entry = sizeCache.get(key);
  if (!entry) {
    return null;
  }

  // Check if cache entry is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    sizeCache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Store size data in cache
 */
function setCachedSize(key: string, data: SizeInfo): void {
  evictOldestCacheEntry();
  sizeCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear cached size data for a specific key
 */
export function clearCachedSize(key: string): void {
  sizeCache.delete(key);
}

/**
 * Clear all cached size data
 */
export function clearAllCachedSizes(): void {
  sizeCache.clear();
}

/**
 * Generate cache key for docs
 */
export function getDocsCacheKey(startUrl: string, embeddingId: string): string {
  return `docs:${startUrl}:${embeddingId}`;
}

/**
 * Generate cache key for codebase
 */
export function getCodebaseCacheKey(workspaceDir: string): string {
  return `codebase:${workspaceDir}`;
}

/**
 * Clear cache for docs indexing
 */
export function clearDocsCache(startUrl: string, embeddingId: string): void {
  const cacheKey = getDocsCacheKey(startUrl, embeddingId);
  clearCachedSize(cacheKey);
}

/**
 * Clear cache for codebase indexing
 */
export function clearCodebaseCache(workspaceDir: string): void {
  const cacheKey = getCodebaseCacheKey(workspaceDir);
  clearCachedSize(cacheKey);
}

/**
 * Enhanced docs size calculation with more accurate counting
 */
async function countDocsPages(
  startUrl: string,
  embeddingId: string,
): Promise<number> {
  try {
    // Check for SQLite metadata first
    const sqlitePath = getDocsSqlitePath();
    if (!fs.existsSync(sqlitePath)) {
      return 0;
    }

    // Try to dynamically import sqlite3 and count actual entries
    try {
      const sqlite3 = await import("sqlite3");
      const { open } = await import("sqlite");

      const db = await open({
        filename: sqlitePath,
        driver: sqlite3.Database,
      });

      const result = await db.get(
        "SELECT COUNT(*) as count FROM docs WHERE startUrl = ? AND embeddingsProviderId = ?",
        [startUrl, embeddingId],
      );

      await db.close();

      // If we found metadata, try to get actual page count from LanceDB
      if (result?.count > 0) {
        try {
          const lance = await import("vectordb");
          const conn = await lance.connect(getLanceDbPath());

          // Get table name based on embedding ID (following DocsService pattern)
          const sanitizedTableName = `docs${embeddingId}`.replace(
            /[^a-zA-Z0-9_.-]/g,
            "_",
          );

          const tableNames = await conn.tableNames();
          if (tableNames.includes(sanitizedTableName)) {
            const table = await conn.openTable(sanitizedTableName);
            const results = await table
              .filter(`starturl = '${startUrl}'`)
              .select(["starturl"])
              .execute();

            return results.length;
          }
        } catch (lanceErr) {
          console.debug("LanceDB count failed, using SQLite count:", lanceErr);
        }

        return result.count;
      }

      return 0;
    } catch (sqliteErr) {
      console.debug("SQLite count failed:", sqliteErr);
      return 0;
    }
  } catch (err) {
    console.debug(`Failed to count docs pages for ${startUrl}:`, err);
    return 0;
  }
}

/**
 * Enhanced codebase file counting using multiple approaches
 */
async function countCodebaseFiles(workspaceDir: string): Promise<number> {
  try {
    // First try to get count from SQLite index if it exists
    const indexSqlitePath = path.join(
      path.dirname(getLanceDbPath()),
      "index.sqlite",
    );

    if (fs.existsSync(indexSqlitePath)) {
      try {
        const sqlite3 = await import("sqlite3");
        const { open } = await import("sqlite");

        const db = await open({
          filename: indexSqlitePath,
          driver: sqlite3.Database,
        });

        // Query for files indexed for this workspace
        const result = await db.get(
          "SELECT COUNT(DISTINCT path) as count FROM lance_db_cache WHERE tag LIKE ?",
          [`%${path.basename(workspaceDir)}%`],
        );

        await db.close();

        if (result?.count > 0) {
          return result.count;
        }
      } catch (sqliteErr) {
        console.debug("SQLite file count failed:", sqliteErr);
      }
    }

    // Fallback: estimate from LanceDB directory structure
    const lanceDbPath = getLanceDbPath();
    if (fs.existsSync(lanceDbPath)) {
      const entries = await fs.promises.readdir(lanceDbPath, {
        withFileTypes: true,
      });
      let estimatedFiles = 0;

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Count files in subdirectories (rough estimate)
          const subFiles = await countFilesInDirectory(
            path.join(lanceDbPath, entry.name),
          );
          estimatedFiles += Math.floor(subFiles * 0.1); // Rough conversion factor
        }
      }

      return estimatedFiles;
    }

    return 0;
  } catch (err) {
    console.debug(`Failed to count codebase files for ${workspaceDir}:`, err);
    return 0;
  }
}

/**
 * Calculates the size and page count for a docs index with caching.
 * For docs, each LanceDB table represents pages from a documentation site.
 * @param startUrl - The starting URL of the documentation site
 * @param embeddingId - The embedding provider ID for cache differentiation
 * @returns Promise resolving to size and page count
 */
export async function getDocsIndexSize(
  startUrl: string,
  embeddingId?: string,
): Promise<DocsIndexSize> {
  // Use a default embedding ID if not provided for backward compatibility
  const effectiveEmbeddingId = embeddingId || "default";
  const cacheKey = getDocsCacheKey(startUrl, effectiveEmbeddingId);

  // Check cache first
  const cached = getCachedSize(cacheKey);
  if (cached) {
    return cached as DocsIndexSize;
  }

  try {
    let size = 0;
    let count = 0;

    // Calculate size from LanceDB files based on embedding ID
    const lanceDbPath = getLanceDbPath();
    const sanitizedTableName = `docs${effectiveEmbeddingId}`.replace(
      /[^a-zA-Z0-9_.-]/g,
      "_",
    );
    const tablePath = path.join(lanceDbPath, sanitizedTableName + ".lance");

    if (fs.existsSync(tablePath)) {
      size = await calculateDirectorySize(tablePath);
    } else {
      // Fallback to old method for backward compatibility
      const tableId = Buffer.from(startUrl)
        .toString("base64")
        .replace(/[/+=]/g, "_");
      const fallbackTablePath = path.join(lanceDbPath, tableId);

      if (fs.existsSync(fallbackTablePath)) {
        size = await calculateDirectorySize(fallbackTablePath);
      }
    }

    // Add SQLite metadata size
    try {
      const sqliteStats = await fs.promises.stat(getDocsSqlitePath());
      size += sqliteStats.size;
    } catch (err) {
      console.debug(`SQLite file not found: ${getDocsSqlitePath()}`);
    }

    // Get accurate page count using enhanced method
    count = await countDocsPages(startUrl, effectiveEmbeddingId);

    const result: DocsIndexSize = { size, count };
    setCachedSize(cacheKey, result);
    return result;
  } catch (error) {
    console.error(
      `Failed to calculate docs index size for ${startUrl}:`,
      error,
    );
    return { size: 0, count: 0 };
  }
}

/**
 * Calculates the size and file count for a codebase index with caching.
 * For codebase, the LanceDB directory contains indexed files from the workspace.
 * @param workspaceDir - The workspace directory path
 * @returns Promise resolving to size and file count
 */
export async function getCodebaseIndexSize(
  workspaceDir: string,
): Promise<CodebaseIndexSize> {
  const cacheKey = getCodebaseCacheKey(workspaceDir);

  // Check cache first
  const cached = getCachedSize(cacheKey);
  if (cached) {
    return cached as CodebaseIndexSize;
  }

  try {
    const lanceDbPath = getLanceDbPath();
    let totalSize = 0;
    let totalFileCount = 0;

    if (fs.existsSync(lanceDbPath)) {
      totalSize = await calculateDirectorySize(lanceDbPath);

      // Use enhanced file counting method
      totalFileCount = await countCodebaseFiles(workspaceDir);
    }

    const result: CodebaseIndexSize = {
      size: totalSize,
      count: totalFileCount,
    };
    setCachedSize(cacheKey, result);
    return result;
  } catch (error) {
    console.error(
      `Failed to calculate codebase index size for ${workspaceDir}:`,
      error,
    );
    return { size: 0, count: 0 };
  }
}

/**
 * Formats size in bytes to a human-readable string.
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.2 MB")
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const base = 1024;
  const decimals = 1;

  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(base)),
    units.length - 1,
  );
  const size = bytes / Math.pow(base, i);

  return `${size.toFixed(decimals)} ${units[i]}`;
}

/**
 * Formats count with appropriate unit (files or pages).
 * @param count - The count number
 * @param type - Either "files" or "pages"
 * @returns Formatted count string (e.g., "45 files")
 */
export function formatCount(count: number, type: "files" | "pages"): string {
  const unit = count === 1 ? type.slice(0, -1) : type; // Remove 's' for singular
  return `${count} ${unit}`;
}

/**
 * Combines size and count into a display string.
 * @param sizeInfo - Object containing size and count
 * @param type - Either "files" or "pages"
 * @returns Formatted display string (e.g., "1.2 MB, 45 files")
 */
export function formatSizeAndCount(
  sizeInfo: SizeInfo,
  type: "files" | "pages",
): string {
  const sizeStr = formatSize(sizeInfo.size);
  const countStr = formatCount(sizeInfo.count, type);
  return `${sizeStr}, ${countStr}`;
}

/**
 * Validates that a path exists and is accessible for size calculation.
 * @param dirPath - Path to validate
 * @returns Promise resolving to boolean indicating if path is valid
 */
export async function validatePath(dirPath: string): Promise<boolean> {
  try {
    await fs.promises.access(dirPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Error handling wrapper for size calculations.
 * Ensures that size calculation errors are handled gracefully and never throw.
 * @param calculation - The size calculation function to wrap
 * @returns Wrapped function that always returns a valid SizeInfo object
 */
export function withErrorHandling<T extends SizeInfo>(
  calculation: () => Promise<T>,
): () => Promise<T> {
  return async () => {
    try {
      return await calculation();
    } catch (error) {
      console.error("Size calculation failed:", error);
      return { size: 0, count: 0 } as T;
    }
  };
}
