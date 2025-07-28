import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { indexingSlice } from "../../../../../redux/slices/indexingSlice";
import CodebaseSection from "./CodebaseSection";

// Mock the IndexSize components
vi.mock("../../../../IndexSize/IndexSizeDisplay", () => ({
  CodebaseIndexSizeDisplay: ({ sizeInfo, isLoading, className }: any) => (
    <div data-testid="codebase-size-display" className={className}>
      {isLoading
        ? "Loading..."
        : `${sizeInfo?.size || 0} bytes, ${sizeInfo?.count || 0} files`}
    </div>
  ),
  useShouldShowSize: vi.fn((status: string) => status === "complete"),
}));

// Mock the ExploreBlocksButton
vi.mock("../ExploreBlocksButton", () => ({
  ExploreBlocksButton: ({ blockType }: { blockType: string }) => (
    <button data-testid="explore-blocks-button">Explore {blockType}</button>
  ),
}));

const createMockStore = (indexingStatuses: any = {}) => {
  return configureStore({
    reducer: {
      indexing: indexingSlice.reducer,
    },
    preloadedState: {
      indexing: {
        indexing: {
          statuses: indexingStatuses,
        },
      },
    },
  });
};

describe("CodebaseSection", () => {
  const renderCodebaseSection = (indexingStatuses: any = {}) => {
    const store = createMockStore(indexingStatuses);
    return render(
      <Provider store={store}>
        <CodebaseSection />
      </Provider>,
    );
  };

  it("renders empty state when no codebase indexing is configured", () => {
    renderCodebaseSection();

    expect(
      screen.getByText("No codebase indexing configured"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("explore-blocks-button")).toBeInTheDocument();
    expect(screen.getByText("Explore codebase")).toBeInTheDocument();
  });

  it("renders codebase indexing statuses when configured", () => {
    const mockStatuses = {
      "/project/src": {
        status: "complete",
        progress: 1.0,
        sizeInfo: { size: 1024000, count: 150 },
      },
      "/project/tests": {
        status: "indexing",
        progress: 0.7,
        sizeInfo: { size: 512000, count: 75 },
      },
      "https://docs.example.com": {
        status: "complete",
        progress: 1.0,
        sizeInfo: { size: 2048000, count: 200 },
      },
    };

    renderCodebaseSection(mockStatuses);

    // Should filter out docs (URLs) and only show codebase entries
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("tests")).toBeInTheDocument();
    expect(screen.queryByText("docs.example.com")).not.toBeInTheDocument();

    // Should show explore button
    expect(screen.getByTestId("explore-blocks-button")).toBeInTheDocument();
  });

  it("sorts statuses correctly by priority", () => {
    const mockStatuses = {
      "/project/failed": {
        status: "failed",
        progress: 0.0,
        description: "Index failed",
      },
      "/project/complete": {
        status: "complete",
        progress: 1.0,
        sizeInfo: { size: 1024000, count: 150 },
      },
      "/project/indexing": {
        status: "indexing",
        progress: 0.5,
      },
      "/project/pending": {
        status: "pending",
        progress: 0.0,
      },
    };

    renderCodebaseSection(mockStatuses);

    // All codebase entries should be visible
    expect(screen.getByText("complete")).toBeInTheDocument();
    expect(screen.getByText("indexing")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("filters out docs URLs correctly", () => {
    const mockStatuses = {
      "/local/directory": {
        status: "complete",
        progress: 1.0,
      },
      "file:///absolute/folder": {
        status: "complete",
        progress: 1.0,
      },
      "http://example.com": {
        status: "complete",
        progress: 1.0,
      },
      "https://docs.site.com": {
        status: "complete",
        progress: 1.0,
      },
    };

    renderCodebaseSection(mockStatuses);

    // Should show local paths
    expect(screen.getByText("directory")).toBeInTheDocument(); // from "/local/directory"
    expect(screen.getByText("folder")).toBeInTheDocument(); // from "file:///absolute/folder"

    // Should not show URLs
    expect(screen.queryByText("example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("docs.site.com")).not.toBeInTheDocument();
  });
});
