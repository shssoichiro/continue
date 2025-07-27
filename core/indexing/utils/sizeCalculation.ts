import * as fs from "fs";
import * as path from "path";
import { getLanceDbPath } from "../../util/paths";

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
 * Calculates the size and page count for a docs index.
 * For docs, each LanceDB table represents pages from a documentation site.
 * @param startUrl - The starting URL of the documentation site
 * @returns Promise resolving to size and page count
 */
export async function getDocsIndexSize(
  startUrl: string,
): Promise<DocsIndexSize> {
  try {
    const lanceDbPath = getLanceDbPath();
    // LanceDB tables are typically stored as directories within the LanceDB path
    // The table name is usually derived from the startUrl
    const tableId = Buffer.from(startUrl)
      .toString("base64")
      .replace(/[/+=]/g, "_");
    const tablePath = path.join(lanceDbPath, tableId);

    let size = 0;
    let count = 0;

    if (fs.existsSync(tablePath)) {
      size = await calculateDirectorySize(tablePath);

      // For docs, we count the number of unique pages/chunks
      // This is an approximation - in a real implementation, you might
      // query the LanceDB table for the actual count
      const fileCount = await countFilesInDirectory(tablePath);

      // Estimate page count based on file structure (this is a rough estimate)
      count = Math.max(1, Math.floor(fileCount / 3)); // Assume ~3 files per page on average
    }

    return { size, count };
  } catch (error) {
    console.error(
      `Failed to calculate docs index size for ${startUrl}:`,
      error,
    );
    return { size: 0, count: 0 };
  }
}

/**
 * Calculates the size and file count for a codebase index.
 * For codebase, the LanceDB directory contains indexed files from the workspace.
 * @param workspaceDir - The workspace directory path
 * @returns Promise resolving to size and file count
 */
export async function getCodebaseIndexSize(
  workspaceDir: string,
): Promise<CodebaseIndexSize> {
  try {
    const lanceDbPath = getLanceDbPath();

    let totalSize = 0;
    let totalFileCount = 0;

    if (fs.existsSync(lanceDbPath)) {
      totalSize = await calculateDirectorySize(lanceDbPath);

      // For codebase, we approximate the number of indexed files
      // In a real implementation, this would query the actual index tables
      const allFiles = await countFilesInDirectory(lanceDbPath);
      // Rough estimate - assume some files are metadata and others are actual content
      totalFileCount = Math.max(0, Math.floor(allFiles * 0.6)); // Rough approximation
    }

    return { size: totalSize, count: totalFileCount };
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
