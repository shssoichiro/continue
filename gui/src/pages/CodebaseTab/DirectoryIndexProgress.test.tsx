import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { DirectoryIndexProgress } from "./DirectoryIndexProgress";

// Mock the useWebviewListener hook
vi.mock("../../hooks/useWebviewListener", () => ({
  useWebviewListener: vi.fn((event, callback) => {
    // Store callback for later use in tests
    (global as any).webviewCallbacks = (global as any).webviewCallbacks || {};
    (global as any).webviewCallbacks[event] = callback;
  }),
}));

describe("DirectoryIndexProgress", () => {
  const mockIdeMessenger = {
    post: vi.fn(),
    request: vi.fn(),
  };

  const mockDirectories = [
    {
      path: "/test/dir1",
      status: "done" as const,
      progress: 1.0,
      lastIndexed: new Date("2024-01-01T12:00:00Z"),
      indexSize: 1024 * 1024, // 1MB
    },
    {
      path: "/test/dir2",
      status: "indexing" as const,
      progress: 0.5,
      indexSize: 512 * 1024, // 512KB
    },
    {
      path: "/test/dir3",
      status: "failed" as const,
      progress: 0.3,
      errorMessage: "Permission denied",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).webviewCallbacks = {};
  });

  const renderWithContext = (props = {}) => {
    return render(
      <IdeMessengerContext.Provider value={mockIdeMessenger}>
        <DirectoryIndexProgress directories={mockDirectories} {...props} />
      </IdeMessengerContext.Provider>,
    );
  };

  it("displays overall progress summary", () => {
    renderWithContext();

    expect(screen.getByText("Directory Indexing Progress")).toBeInTheDocument();

    // Check overall progress (average: (1.0 + 0.5 + 0.3) / 3 = 60%)
    expect(screen.getByText("60% complete")).toBeInTheDocument();

    // Check status counts
    expect(screen.getByText("1 completed")).toBeInTheDocument();
    expect(screen.getByText("1 indexing")).toBeInTheDocument();
    expect(screen.getByText("1 failed")).toBeInTheDocument();
  });

  it("shows progress bar with correct percentage", () => {
    renderWithContext();

    const progressBar = document.querySelector(".bg-blue-500");
    expect(progressBar).toHaveStyle({ width: "60%" });
  });

  it("renders individual directory statuses", () => {
    renderWithContext();

    expect(screen.getByText("/test/dir1")).toBeInTheDocument();
    expect(screen.getByText("/test/dir2")).toBeInTheDocument();
    expect(screen.getByText("/test/dir3")).toBeInTheDocument();
  });

  it("handles empty directories list", () => {
    render(
      <IdeMessengerContext.Provider value={mockIdeMessenger}>
        <DirectoryIndexProgress directories={[]} />
      </IdeMessengerContext.Provider>,
    );

    expect(
      screen.getByText("No directories being tracked for indexing."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Directories will appear here when indexing is enabled.",
      ),
    ).toBeInTheDocument();
  });

  it("requests initial directory statuses on mount", () => {
    renderWithContext();

    expect(mockIdeMessenger.post).toHaveBeenCalledWith(
      "index/getDirectoryIndexStatuses",
      undefined,
    );
  });

  it("updates statuses when webview listener receives data", async () => {
    renderWithContext();

    const newDirectories = [
      {
        path: "/test/updated",
        status: "done" as const,
        progress: 1.0,
        indexSize: 2048 * 1024, // 2MB
      },
    ];

    // Simulate webview listener callback
    const callback = (global as any).webviewCallbacks["directoryIndexProgress"];
    if (callback) {
      await callback(newDirectories);
    }

    await waitFor(() => {
      expect(screen.getByText("/test/updated")).toBeInTheDocument();
    });
  });

  it("handles directory retry action", () => {
    renderWithContext();

    // Find failed directory and trigger retry through DirectoryIndexStatus
    const failedStatus = screen.getByText("Failed");
    fireEvent.mouseEnter(failedStatus);

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    expect(mockIdeMessenger.post).toHaveBeenCalledWith(
      "index/retryDirectoryIndex",
      { path: "/test/dir3" },
    );
  });

  it("handles directory pause action", () => {
    renderWithContext();

    // Find indexing directory and trigger pause
    const indexingStatus = screen.getByText("Indexing");
    fireEvent.mouseEnter(indexingStatus);

    const pauseButton = screen.getByText("Pause");
    fireEvent.click(pauseButton);

    expect(mockIdeMessenger.post).toHaveBeenCalledWith(
      "index/pauseDirectoryIndex",
      { path: "/test/dir2" },
    );
  });

  it("handles directory resume action", () => {
    const pausedDirectories = [
      {
        path: "/test/paused",
        status: "paused" as const,
        progress: 0.7,
        indexSize: 256 * 1024,
      },
    ];

    render(
      <IdeMessengerContext.Provider value={mockIdeMessenger}>
        <DirectoryIndexProgress directories={pausedDirectories} />
      </IdeMessengerContext.Provider>,
    );

    // Find paused directory and trigger resume
    const pausedStatus = screen.getByText("Paused");
    fireEvent.mouseEnter(pausedStatus);

    const resumeButton = screen.getByText("Resume");
    fireEvent.click(resumeButton);

    expect(mockIdeMessenger.post).toHaveBeenCalledWith(
      "index/resumeDirectoryIndex",
      { path: "/test/paused" },
    );
  });

  it("calculates correct overall progress", () => {
    const testDirectories = [
      { path: "/dir1", status: "done" as const, progress: 1.0 },
      { path: "/dir2", status: "indexing" as const, progress: 0.4 },
      { path: "/dir3", status: "done" as const, progress: 1.0 },
    ];

    render(
      <IdeMessengerContext.Provider value={mockIdeMessenger}>
        <DirectoryIndexProgress directories={testDirectories} />
      </IdeMessengerContext.Provider>,
    );

    // Progress should be (1.0 + 0.4 + 1.0) / 3 = 80%
    expect(screen.getByText("80% complete")).toBeInTheDocument();
  });

  it("updates size display when indexing completes", async () => {
    renderWithContext();

    // Simulate a directory completing indexing with updated size
    const updatedDirectories = [
      {
        path: "/test/dir2",
        status: "done" as const,
        progress: 1.0,
        indexSize: 1024 * 1024 * 2, // 2MB (increased from 512KB)
      },
    ];

    const callback = (global as any).webviewCallbacks["directoryIndexProgress"];
    if (callback) {
      await callback(updatedDirectories);
    }

    await waitFor(() => {
      // Should show updated size
      expect(screen.getByText("2.0 MB")).toBeInTheDocument();
    });
  });
});
