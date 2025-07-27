import {
  CodebaseIndexSize,
  DocsIndexSize,
  formatCount,
  formatSize,
  formatSizeAndCount,
  getCodebaseIndexSize,
  getDocsIndexSize,
  SizeInfo,
  validatePath,
  withErrorHandling,
} from "./sizeCalculation";

// FIXME: several tests have needed to be marked with `skip`
// because the mocks are not working correctly.

// Mock the paths module (relative to `core/test/jest.setup-after-env.js`)
jest.mock("../util/paths", () => {
  return {
    getLanceDbPath: jest.fn(() => {
      return "/mock/lancedb/path";
    }),
  };
});

// Mock fs module
const mockExistsSync = jest.fn();
const mockStat = jest.fn();
const mockReaddir = jest.fn();
const mockAccess = jest.fn();
jest.mock("fs", () => ({
  existsSync: mockExistsSync,
  promises: {
    stat: mockStat,
    readdir: mockReaddir,
    access: mockAccess,
  },
  constants: {
    R_OK: 4,
  },
}));

describe("sizeCalculation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getDocsIndexSize", () => {
    test("should return zero size and count for non-existent docs index", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await getDocsIndexSize("https://example.com/docs");

      expect(result).toEqual({ size: 0, count: 0 });
    });

    test.skip("should calculate size and count for existing docs index", async () => {
      const startUrl = "https://example.com/docs";
      const expectedTableId = Buffer.from(startUrl)
        .toString("base64")
        .replace(/[/+=]/g, "_");

      mockExistsSync.mockReturnValue(true);
      mockStat.mockImplementation((filePath: string) => {
        if (filePath.includes(expectedTableId)) {
          return Promise.resolve({ isDirectory: () => true, size: 0 });
        }
        return Promise.resolve({ isDirectory: () => false, size: 1024 });
      });
      mockReaddir.mockResolvedValue(["file1.json", "file2.json", "file3.json"]);

      const result = await getDocsIndexSize(startUrl);

      expect(result.size).toBeGreaterThan(0);
      expect(result.count).toBeGreaterThan(0);
      expect(mockExistsSync).toHaveBeenCalled();
    });

    test("should handle errors gracefully", async () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error("File system error");
      });

      const result = await getDocsIndexSize("https://example.com/docs");

      expect(result).toEqual({ size: 0, count: 0 });
    });
  });

  describe("getCodebaseIndexSize", () => {
    test("should return zero size and count for non-existent codebase index", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await getCodebaseIndexSize("/workspace/path");

      expect(result).toEqual({ size: 0, count: 0 });
    });

    test.skip("should calculate size and count for existing codebase index", async () => {
      mockExistsSync.mockReturnValue(true);
      mockStat.mockImplementation((filePath: string) => {
        if (filePath.includes("lancedb")) {
          return Promise.resolve({ isDirectory: () => true, size: 0 });
        }
        return Promise.resolve({ isDirectory: () => false, size: 2048 });
      });
      mockReaddir.mockResolvedValue([
        "index1.json",
        "index2.json",
        "index3.json",
        "meta1.json",
        "meta2.json",
      ]);

      const result = await getCodebaseIndexSize("/workspace/path");

      expect(result.size).toBeGreaterThan(0);
      expect(result.count).toBeGreaterThan(0);
    });

    test("should handle errors gracefully", async () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error("File system error");
      });

      const result = await getCodebaseIndexSize("/workspace/path");

      expect(result).toEqual({ size: 0, count: 0 });
    });
  });

  describe("formatSize", () => {
    test("should format bytes correctly", () => {
      expect(formatSize(0)).toBe("0 B");
      expect(formatSize(512)).toBe("512.0 B");
      expect(formatSize(1024)).toBe("1.0 KB");
      expect(formatSize(1536)).toBe("1.5 KB");
      expect(formatSize(1048576)).toBe("1.0 MB");
      expect(formatSize(1073741824)).toBe("1.0 GB");
      expect(formatSize(1099511627776)).toBe("1.0 TB");
    });

    test("should handle very large numbers", () => {
      const result = formatSize(Number.MAX_SAFE_INTEGER);
      expect(result).toContain("TB");
    });
  });

  describe("formatCount", () => {
    test("should format file counts correctly", () => {
      expect(formatCount(0, "files")).toBe("0 files");
      expect(formatCount(1, "files")).toBe("1 file");
      expect(formatCount(2, "files")).toBe("2 files");
      expect(formatCount(100, "files")).toBe("100 files");
    });

    test("should format page counts correctly", () => {
      expect(formatCount(0, "pages")).toBe("0 pages");
      expect(formatCount(1, "pages")).toBe("1 page");
      expect(formatCount(2, "pages")).toBe("2 pages");
      expect(formatCount(50, "pages")).toBe("50 pages");
    });
  });

  describe("formatSizeAndCount", () => {
    test("should combine size and count for files", () => {
      const sizeInfo: SizeInfo = { size: 1048576, count: 42 };
      const result = formatSizeAndCount(sizeInfo, "files");
      expect(result).toBe("1.0 MB, 42 files");
    });

    test("should combine size and count for pages", () => {
      const sizeInfo: SizeInfo = { size: 2048, count: 1 };
      const result = formatSizeAndCount(sizeInfo, "pages");
      expect(result).toBe("2.0 KB, 1 page");
    });

    test("should handle zero values", () => {
      const sizeInfo: SizeInfo = { size: 0, count: 0 };
      const result = formatSizeAndCount(sizeInfo, "files");
      expect(result).toBe("0 B, 0 files");
    });
  });

  describe("validatePath", () => {
    test.skip("should return true for accessible paths", async () => {
      mockAccess.mockResolvedValue(undefined);

      const result = await validatePath("/valid/path");

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith("/valid/path", 4);
    });

    test("should return false for inaccessible paths", async () => {
      mockAccess.mockRejectedValue(new Error("Permission denied"));

      const result = await validatePath("/invalid/path");

      expect(result).toBe(false);
    });
  });

  describe("withErrorHandling", () => {
    test("should return result when calculation succeeds", async () => {
      const mockCalculation = jest
        .fn()
        .mockResolvedValue({ size: 1024, count: 5 });
      const wrappedCalculation = withErrorHandling(mockCalculation);

      const result = await wrappedCalculation();

      expect(result).toEqual({ size: 1024, count: 5 });
      expect(mockCalculation).toHaveBeenCalledTimes(1);
    });

    test("should return zero values when calculation throws", async () => {
      const mockCalculation = jest
        .fn()
        .mockRejectedValue(new Error("Calculation failed"));
      const wrappedCalculation = withErrorHandling(mockCalculation);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await wrappedCalculation();

      expect(result).toEqual({ size: 0, count: 0 });
      expect(mockCalculation).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Size calculation failed:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    test("should handle TypeScript types correctly", async () => {
      const docsCalculation = jest
        .fn()
        .mockResolvedValue({ size: 2048, count: 10 } as DocsIndexSize);
      const wrappedDocsCalculation = withErrorHandling(docsCalculation);

      const docsResult = await wrappedDocsCalculation();
      expect(docsResult).toEqual({ size: 2048, count: 10 });

      const codebaseCalculation = jest
        .fn()
        .mockResolvedValue({ size: 4096, count: 20 } as CodebaseIndexSize);
      const wrappedCodebaseCalculation = withErrorHandling(codebaseCalculation);

      const codebaseResult = await wrappedCodebaseCalculation();
      expect(codebaseResult).toEqual({ size: 4096, count: 20 });
    });
  });

  describe("integration tests", () => {
    test.skip("should handle realistic file system structures", async () => {
      // Mock a realistic LanceDB structure
      mockExistsSync.mockReturnValue(true);

      const fileStructure = new Map([
        [
          "/mock/lancedb/path",
          { isDirectory: true, size: 0, files: ["table1", "table2"] },
        ],
        [
          "/mock/lancedb/path/table1",
          {
            isDirectory: true,
            size: 0,
            files: ["data.arrow", "metadata.json"],
          },
        ],
        [
          "/mock/lancedb/path/table1/data.arrow",
          { isDirectory: false, size: 1048576 },
        ],
        [
          "/mock/lancedb/path/table1/metadata.json",
          { isDirectory: false, size: 1024 },
        ],
        [
          "/mock/lancedb/path/table2",
          {
            isDirectory: true,
            size: 0,
            files: ["data.arrow", "metadata.json"],
          },
        ],
        [
          "/mock/lancedb/path/table2/data.arrow",
          { isDirectory: false, size: 2097152 },
        ],
        [
          "/mock/lancedb/path/table2/metadata.json",
          { isDirectory: false, size: 2048 },
        ],
      ]);

      mockStat.mockImplementation((filePath: string) => {
        const info = fileStructure.get(filePath);
        if (!info) {
          throw new Error(`File not found: ${filePath}`);
        }
        return Promise.resolve({
          isDirectory: () => info.isDirectory,
          size: info.size,
        });
      });

      mockReaddir.mockImplementation((dirPath: string) => {
        const info = fileStructure.get(dirPath);
        return Promise.resolve(info?.files || []);
      });

      const result = await getCodebaseIndexSize("/workspace");

      expect(result.size).toBeGreaterThan(3000000); // Should be sum of all files
      expect(result.count).toBeGreaterThan(0);
    });

    test.skip("should handle permission errors gracefully", async () => {
      mockExistsSync.mockReturnValue(true);
      mockStat.mockImplementation((filePath: string) => {
        if (filePath.includes("restricted")) {
          throw new Error("Permission denied");
        }
        return Promise.resolve({ isDirectory: () => false, size: 1024 });
      });
      mockReaddir.mockResolvedValue(["normal.json", "restricted.json"]);

      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = await getCodebaseIndexSize("/workspace");

      expect(result.size).toBeGreaterThan(0); // Should still calculate accessible files
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
