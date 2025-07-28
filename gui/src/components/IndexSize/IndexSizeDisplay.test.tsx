import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CodebaseIndexSizeDisplay,
  DocsIndexSizeDisplay,
  IndexSizeDisplay,
  useShouldShowSize,
} from "./IndexSizeDisplay";
import type { SizeInfo } from "./SizeFormatter";

// Mock the theme utilities
vi.mock("../../styles/theme", () => ({
  varWithFallback: vi.fn((colorName: string) => `var(--vscode-${colorName})`),
}));

describe("IndexSizeDisplay", () => {
  const mockSizeInfo: SizeInfo = {
    size: 1048576, // 1 MB
    count: 42,
  };

  describe("IndexSizeDisplay", () => {
    it("should render size information for files", () => {
      const { container } = render(
        <IndexSizeDisplay sizeInfo={mockSizeInfo} type="files" />,
      );

      expect(container.textContent).toBe("1.0 MB, 42 files");
    });

    it("should render size information for pages", () => {
      const { container } = render(
        <IndexSizeDisplay sizeInfo={mockSizeInfo} type="pages" />,
      );

      expect(container.textContent).toBe("1.0 MB, 42 pages");
    });

    it("should show loading state", () => {
      const { container } = render(
        <IndexSizeDisplay type="files" isLoading={true} />,
      );

      // Should contain skeleton loader
      const skeletonLoader = container.querySelector('[role="progressbar"]');
      expect(skeletonLoader).toBeInTheDocument();
    });

    it("should show compact loading state", () => {
      const { container } = render(
        <IndexSizeDisplay type="files" isLoading={true} compact={true} />,
      );

      // Should contain skeleton loader with compact styling
      const skeletonLoader = container.querySelector('[role="progressbar"]');
      expect(skeletonLoader).toBeInTheDocument();
      expect(skeletonLoader).toHaveStyle({
        width: "70px",
        height: "10px",
      });
    });

    it("should show fallback text for invalid size info", () => {
      const { container } = render(
        <IndexSizeDisplay sizeInfo={undefined} type="files" />,
      );

      expect(container.textContent).toBe("Size unavailable");
    });

    it("should show custom fallback text", () => {
      const customFallback = "Custom error message";
      const { container } = render(
        <IndexSizeDisplay
          sizeInfo={undefined}
          type="files"
          fallbackText={customFallback}
        />,
      );

      expect(container.textContent).toBe(customFallback);
    });

    it("should apply custom className", () => {
      const { container } = render(
        <IndexSizeDisplay
          sizeInfo={mockSizeInfo}
          type="files"
          className="custom-class"
        />,
      );

      const displayElement = container.firstChild as HTMLElement;
      expect(displayElement).toHaveClass("custom-class");
    });

    it("should have proper styling", () => {
      const { container } = render(
        <IndexSizeDisplay sizeInfo={mockSizeInfo} type="files" />,
      );

      const displayElement = container.firstChild as HTMLElement;
      expect(displayElement).toHaveClass("mt-1");
      expect(displayElement).toHaveStyle({
        color: "var(--vscode-description-muted)",
        fontSize: "10px",
        lineHeight: "14px",
      });
    });

    it("should have proper accessibility attributes", () => {
      const { container } = render(
        <IndexSizeDisplay sizeInfo={mockSizeInfo} type="files" />,
      );

      const displayElement = container.firstChild as HTMLElement;
      expect(displayElement).toHaveAttribute("role", "status");
      expect(displayElement).toHaveAttribute(
        "aria-label",
        "Index size: 1.0 MB, 42 files",
      );
    });

    it("should include test ID when provided", () => {
      const { container } = render(
        <IndexSizeDisplay
          sizeInfo={mockSizeInfo}
          type="files"
          data-testid="size-display"
        />,
      );

      const displayElement = container.firstChild as HTMLElement;
      expect(displayElement).toHaveAttribute("data-testid", "size-display");
    });

    it("should make text non-selectable", () => {
      const { container } = render(
        <IndexSizeDisplay sizeInfo={mockSizeInfo} type="files" />,
      );

      const textSpan = container.querySelector("span");
      expect(textSpan).toHaveClass("select-none");
    });
  });

  describe("DocsIndexSizeDisplay", () => {
    it("should render with pages type", () => {
      const { container } = render(
        <DocsIndexSizeDisplay sizeInfo={mockSizeInfo} />,
      );

      expect(container.textContent).toBe("1.0 MB, 42 pages");
    });

    it("should pass through all props except type", () => {
      const { container } = render(
        <DocsIndexSizeDisplay
          sizeInfo={mockSizeInfo}
          isLoading={false}
          className="docs-custom"
          fallbackText="Docs unavailable"
          data-testid="docs-size"
        />,
      );

      const displayElement = container.firstChild as HTMLElement;
      expect(displayElement).toHaveClass("docs-custom");
      expect(displayElement).toHaveAttribute("data-testid", "docs-size");
    });
  });

  describe("CodebaseIndexSizeDisplay", () => {
    it("should render with files type", () => {
      const { container } = render(
        <CodebaseIndexSizeDisplay sizeInfo={mockSizeInfo} />,
      );

      expect(container.textContent).toBe("1.0 MB, 42 files");
    });

    it("should pass through all props except type", () => {
      const { container } = render(
        <CodebaseIndexSizeDisplay
          sizeInfo={mockSizeInfo}
          isLoading={false}
          className="codebase-custom"
          fallbackText="Codebase unavailable"
          data-testid="codebase-size"
        />,
      );

      const displayElement = container.firstChild as HTMLElement;
      expect(displayElement).toHaveClass("codebase-custom");
      expect(displayElement).toHaveAttribute("data-testid", "codebase-size");
    });
  });

  describe("edge cases", () => {
    it("should handle zero size info", () => {
      const zeroSizeInfo: SizeInfo = { size: 0, count: 0 };
      const { container } = render(
        <IndexSizeDisplay sizeInfo={zeroSizeInfo} type="files" />,
      );

      expect(container.textContent).toBe("0 B, 0 files");
    });

    it("should handle large size info", () => {
      const largeSizeInfo: SizeInfo = { size: 5368709120, count: 10000 }; // 5 GB
      const { container } = render(
        <IndexSizeDisplay sizeInfo={largeSizeInfo} type="files" />,
      );

      expect(container.textContent).toBe("5.0 GB, 10000 files");
    });

    it("should handle invalid size info gracefully", () => {
      const invalidSizeInfo = { size: -1, count: -1 } as SizeInfo;
      const { container } = render(
        <IndexSizeDisplay sizeInfo={invalidSizeInfo} type="files" />,
      );

      expect(container.textContent).toBe("Size unavailable");
    });
  });

  describe("loading states", () => {
    it("should show loading aria-label when loading", () => {
      const { container } = render(
        <IndexSizeDisplay type="files" isLoading={true} />,
      );

      const displayElement = container.firstChild as HTMLElement;
      expect(displayElement).toHaveAttribute(
        "aria-label",
        "Loading size information",
      );
    });

    it("should transition from loading to content", () => {
      const { container, rerender } = render(
        <IndexSizeDisplay type="files" isLoading={true} />,
      );

      // Initially loading
      expect(
        container.querySelector('[role="progressbar"]'),
      ).toBeInTheDocument();

      // After loading completes
      rerender(
        <IndexSizeDisplay
          sizeInfo={mockSizeInfo}
          type="files"
          isLoading={false}
        />,
      );

      expect(
        container.querySelector('[role="progressbar"]'),
      ).not.toBeInTheDocument();
      expect(container.textContent).toBe("1.0 MB, 42 files");
    });
  });
});

describe("useShouldShowSize", () => {
  it("should return true for complete status", () => {
    expect(useShouldShowSize("complete")).toBe(true);
  });

  it("should return true for done status", () => {
    expect(useShouldShowSize("done")).toBe(true);
  });

  it("should return false for other statuses", () => {
    expect(useShouldShowSize("indexing")).toBe(false);
    expect(useShouldShowSize("failed")).toBe(false);
    expect(useShouldShowSize("paused")).toBe(false);
    expect(useShouldShowSize("pending")).toBe(false);
    expect(useShouldShowSize("loading")).toBe(false);
  });

  it("should return false for undefined status", () => {
    expect(useShouldShowSize(undefined)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(useShouldShowSize("")).toBe(false);
  });
});
