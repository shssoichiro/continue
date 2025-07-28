import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CodebaseIndexingStatus from "./CodebaseIndexingStatus";

// Mock the IndexSize components
vi.mock("../../../../IndexSize/IndexSizeDisplay", () => ({
  CodebaseIndexSizeDisplay: ({ sizeInfo, isLoading, className }: any) => (
    <div data-testid="codebase-size-display" className={className}>
      {isLoading
        ? "Loading..."
        : `${sizeInfo?.size || 0} bytes, ${sizeInfo?.count || 0} files`}
    </div>
  ),
  useShouldShowSize: vi.fn(
    (status: string) => status === "complete" || status === "done",
  ),
}));

// Mock the StatusIndicator
vi.mock("../docs/StatusIndicator", () => ({
  StatusIndicator: ({ status }: { status: string }) => (
    <div data-testid="status-indicator" data-status={status}>
      {status}
    </div>
  ),
}));

describe("CodebaseIndexingStatus", () => {
  it("renders basic indexing status", () => {
    const status = {
      status: "complete" as const,
      progress: 1.0,
      sizeInfo: { size: 1024000, count: 150 },
    };

    render(
      <CodebaseIndexingStatus
        indexKey="/project/src/components"
        status={status}
      />,
    );

    expect(screen.getByText("components")).toBeInTheDocument();
    expect(screen.getByTestId("status-indicator")).toHaveAttribute(
      "data-status",
      "complete",
    );
    expect(screen.getByTestId("codebase-size-display")).toBeInTheDocument();
  });

  it("displays loading state during indexing", () => {
    const status = {
      status: "indexing" as const,
      progress: 0.5,
      sizeInfo: { size: 512000, count: 75 },
    };

    render(<CodebaseIndexingStatus indexKey="/project/src" status={status} />);

    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByTestId("status-indicator")).toHaveAttribute(
      "data-status",
      "indexing",
    );
    expect(screen.getByText("Progress: 50%")).toBeInTheDocument();
  });

  it("shows error description for failed status", () => {
    const status = {
      status: "failed" as const,
      progress: 0.0,
      description: "Permission denied accessing directory",
    };

    render(
      <CodebaseIndexingStatus indexKey="/restricted/path" status={status} />,
    );

    expect(screen.getByText("path")).toBeInTheDocument();
    expect(screen.getByTestId("status-indicator")).toHaveAttribute(
      "data-status",
      "failed",
    );
    expect(
      screen.getByText("Permission denied accessing directory"),
    ).toBeInTheDocument();
  });

  it("handles index keys with different formats", () => {
    const status = {
      status: "complete" as const,
      progress: 1.0,
    };

    // Test simple key
    const { rerender } = render(
      <CodebaseIndexingStatus indexKey="simple-key" status={status} />,
    );
    expect(screen.getByText("simple-key")).toBeInTheDocument();

    // Test path-like key
    rerender(
      <CodebaseIndexingStatus
        indexKey="/very/long/path/to/deeply/nested/folder"
        status={status}
      />,
    );
    expect(screen.getByText("folder")).toBeInTheDocument();

    // Test key with file extension
    rerender(
      <CodebaseIndexingStatus
        indexKey="/project/src/index.ts"
        status={status}
      />,
    );
    expect(screen.getByText("index.ts")).toBeInTheDocument();
  });

  it("shows size info only when appropriate", () => {
    const statusWithSize = {
      status: "complete" as const,
      progress: 1.0,
      sizeInfo: { size: 1024000, count: 150 },
    };

    const statusWithoutSize = {
      status: "pending" as const,
      progress: 0.0,
    };

    // With size info and complete status
    const { rerender } = render(
      <CodebaseIndexingStatus
        indexKey="/project/src"
        status={statusWithSize}
      />,
    );
    expect(screen.getByTestId("codebase-size-display")).toBeInTheDocument();

    // Without size info or with pending status
    rerender(
      <CodebaseIndexingStatus
        indexKey="/project/src"
        status={statusWithoutSize}
      />,
    );
    expect(
      screen.queryByTestId("codebase-size-display"),
    ).not.toBeInTheDocument();
  });

  it("provides tooltips for long paths", () => {
    const status = {
      status: "complete" as const,
      progress: 1.0,
    };

    render(
      <CodebaseIndexingStatus
        indexKey="/very/long/path/to/deeply/nested/folder/structure"
        status={status}
      />,
    );

    const titleElement = screen.getByTitle(
      "/very/long/path/to/deeply/nested/folder/structure",
    );
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent("structure");
  });

  it("shows progress for indexing status", () => {
    const status = {
      status: "indexing" as const,
      progress: 0.73,
    };

    render(
      <CodebaseIndexingStatus
        indexKey="/project/large-folder"
        status={status}
      />,
    );

    expect(screen.getByText("Progress: 73%")).toBeInTheDocument();
  });

  it("handles undefined progress gracefully", () => {
    const status = {
      status: "indexing" as const,
      progress: undefined,
    };

    render(<CodebaseIndexingStatus indexKey="/project/src" status={status} />);

    expect(screen.queryByText(/Progress:/)).not.toBeInTheDocument();
  });
});
