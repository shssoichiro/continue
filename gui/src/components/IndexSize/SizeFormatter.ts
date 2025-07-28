/**
 * Utilities for formatting file sizes and counts in a human-readable way
 */

export interface SizeInfo {
  size: number; // Size in bytes
  count: number; // Number of files/pages
}

/**
 * Converts bytes to human-readable format with appropriate unit
 * @param bytes Size in bytes
 * @returns Formatted string like "1.2 MB" or "512.0 B"
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;

  // Handle edge case of negative numbers
  if (bytes < 0) return "0 B";

  // Calculate unit index
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Clamp to available units
  const unitIndex = Math.min(i, units.length - 1);

  // Calculate size in the appropriate unit
  const size = bytes / Math.pow(k, unitIndex);

  // Format with 1 decimal place
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Formats count with proper singular/plural form
 * @param count Number of items
 * @param type Type of items ("files" or "pages")
 * @returns Formatted string like "1 file", "2 files", "1 page", "5 pages"
 */
export function formatCount(count: number, type: "files" | "pages"): string {
  if (count === 1) {
    return `1 ${type.slice(0, -1)}`; // Remove 's' for singular
  }
  return `${count} ${type}`;
}

/**
 * Combines size and count into a single formatted string
 * @param sizeInfo Object containing size and count
 * @param type Type of items being counted
 * @returns Formatted string like "1.2 MB, 45 files" or "2.5 KB, 1 page"
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
 * Validates that size info contains valid numbers
 * @param sizeInfo Object to validate
 * @returns true if valid, false otherwise
 */
export function isValidSizeInfo(sizeInfo: any): sizeInfo is SizeInfo {
  return (
    typeof sizeInfo === "object" &&
    sizeInfo !== null &&
    typeof sizeInfo.size === "number" &&
    typeof sizeInfo.count === "number" &&
    sizeInfo.size >= 0 &&
    sizeInfo.count >= 0 &&
    Number.isFinite(sizeInfo.size) &&
    Number.isFinite(sizeInfo.count)
  );
}

/**
 * Safely formats size info with fallback for invalid data
 * @param sizeInfo Size information (may be undefined or invalid)
 * @param type Type of items being counted
 * @param fallback Fallback text if data is invalid
 * @returns Formatted string or fallback
 */
export function safeFormatSizeAndCount(
  sizeInfo: SizeInfo | undefined,
  type: "files" | "pages",
  fallback: string = "Size unavailable",
): string {
  if (!sizeInfo || !isValidSizeInfo(sizeInfo)) {
    return fallback;
  }
  return formatSizeAndCount(sizeInfo, type);
}
