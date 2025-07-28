import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatSize,
  formatSizeAndCount,
  isValidSizeInfo,
  safeFormatSizeAndCount,
  type SizeInfo,
} from "./SizeFormatter";

describe("SizeFormatter", () => {
  describe("formatSize", () => {
    it("should format bytes correctly", () => {
      expect(formatSize(0)).toBe("0 B");
      expect(formatSize(512)).toBe("512.0 B");
      expect(formatSize(1024)).toBe("1.0 KB");
      expect(formatSize(1536)).toBe("1.5 KB");
      expect(formatSize(1048576)).toBe("1.0 MB");
      expect(formatSize(1073741824)).toBe("1.0 GB");
      expect(formatSize(1099511627776)).toBe("1.0 TB");
    });

    it("should handle edge cases", () => {
      // Negative numbers
      expect(formatSize(-100)).toBe("0 B");

      // Very large numbers
      expect(formatSize(Number.MAX_SAFE_INTEGER)).toContain("TB");

      // Fractional bytes (should not occur in practice but handle gracefully)
      expect(formatSize(1023.7)).toBe("1023.7 B");
    });

    it("should round to 1 decimal place", () => {
      expect(formatSize(1234)).toBe("1.2 KB");
      expect(formatSize(1987654321)).toBe("1.9 GB");
      expect(formatSize(5432109876543)).toBe("4.9 TB");
    });
  });

  describe("formatCount", () => {
    it("should format file counts correctly", () => {
      expect(formatCount(0, "files")).toBe("0 files");
      expect(formatCount(1, "files")).toBe("1 file");
      expect(formatCount(2, "files")).toBe("2 files");
      expect(formatCount(100, "files")).toBe("100 files");
    });

    it("should format page counts correctly", () => {
      expect(formatCount(0, "pages")).toBe("0 pages");
      expect(formatCount(1, "pages")).toBe("1 page");
      expect(formatCount(2, "pages")).toBe("2 pages");
      expect(formatCount(50, "pages")).toBe("50 pages");
    });

    it("should handle large numbers", () => {
      expect(formatCount(1000000, "files")).toBe("1000000 files");
      expect(formatCount(999999, "pages")).toBe("999999 pages");
    });
  });

  describe("formatSizeAndCount", () => {
    it("should combine size and count for files", () => {
      const sizeInfo: SizeInfo = { size: 1048576, count: 42 };
      const result = formatSizeAndCount(sizeInfo, "files");
      expect(result).toBe("1.0 MB, 42 files");
    });

    it("should combine size and count for pages", () => {
      const sizeInfo: SizeInfo = { size: 2048, count: 1 };
      const result = formatSizeAndCount(sizeInfo, "pages");
      expect(result).toBe("2.0 KB, 1 page");
    });

    it("should handle zero values", () => {
      const sizeInfo: SizeInfo = { size: 0, count: 0 };
      const result = formatSizeAndCount(sizeInfo, "files");
      expect(result).toBe("0 B, 0 files");
    });

    it("should handle large values", () => {
      const sizeInfo: SizeInfo = { size: 5368709120, count: 10000 };
      const result = formatSizeAndCount(sizeInfo, "files");
      expect(result).toBe("5.0 GB, 10000 files");
    });
  });

  describe("isValidSizeInfo", () => {
    it("should validate correct SizeInfo objects", () => {
      expect(isValidSizeInfo({ size: 1024, count: 10 })).toBe(true);
      expect(isValidSizeInfo({ size: 0, count: 0 })).toBe(true);
      expect(isValidSizeInfo({ size: 999999999, count: 1 })).toBe(true);
    });

    it("should reject invalid objects", () => {
      expect(isValidSizeInfo(null)).toBe(false);
      expect(isValidSizeInfo(undefined)).toBe(false);
      expect(isValidSizeInfo({})).toBe(false);
      expect(isValidSizeInfo({ size: "1024", count: 10 })).toBe(false);
      expect(isValidSizeInfo({ size: 1024, count: "10" })).toBe(false);
      expect(isValidSizeInfo({ size: 1024 })).toBe(false);
      expect(isValidSizeInfo({ count: 10 })).toBe(false);
    });

    it("should reject negative values", () => {
      expect(isValidSizeInfo({ size: -1, count: 10 })).toBe(false);
      expect(isValidSizeInfo({ size: 1024, count: -1 })).toBe(false);
      expect(isValidSizeInfo({ size: -1, count: -1 })).toBe(false);
    });

    it("should reject infinite or NaN values", () => {
      expect(isValidSizeInfo({ size: Infinity, count: 10 })).toBe(false);
      expect(isValidSizeInfo({ size: 1024, count: Infinity })).toBe(false);
      expect(isValidSizeInfo({ size: NaN, count: 10 })).toBe(false);
      expect(isValidSizeInfo({ size: 1024, count: NaN })).toBe(false);
    });
  });

  describe("safeFormatSizeAndCount", () => {
    it("should format valid size info", () => {
      const sizeInfo: SizeInfo = { size: 1024, count: 5 };
      const result = safeFormatSizeAndCount(sizeInfo, "files");
      expect(result).toBe("1.0 KB, 5 files");
    });

    it("should use fallback for undefined size info", () => {
      const result = safeFormatSizeAndCount(undefined, "files");
      expect(result).toBe("Size unavailable");
    });

    it("should use fallback for invalid size info", () => {
      const invalidSizeInfo = { size: -1, count: 10 } as SizeInfo;
      const result = safeFormatSizeAndCount(invalidSizeInfo, "files");
      expect(result).toBe("Size unavailable");
    });

    it("should use custom fallback text", () => {
      const customFallback = "Custom unavailable message";
      const result = safeFormatSizeAndCount(undefined, "files", customFallback);
      expect(result).toBe(customFallback);
    });

    it("should handle null size info", () => {
      const result = safeFormatSizeAndCount(null as any, "pages");
      expect(result).toBe("Size unavailable");
    });

    it("should handle malformed objects", () => {
      const malformed = { size: "invalid", count: "also invalid" } as any;
      const result = safeFormatSizeAndCount(malformed, "files", "Error");
      expect(result).toBe("Error");
    });
  });
});
