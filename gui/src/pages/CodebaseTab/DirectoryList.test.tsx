import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { DirectoryList } from "./DirectoryList";

describe("DirectoryList", () => {
  const mockIdeMessenger = {
    post: vi.fn(),
    request: vi.fn(),
  };

  const mockDirectories = [
    {
      path: "/test/src",
      status: "done" as const,
      progress: 1.0,
      lastIndexed: new Date("2024-01-01T12:00:00Z"),
      indexSize: 1024 * 1024 * 2, // 2MB
    },
    {
      path: "/test/docs",
      status: "indexing" as const,
      progress: 0.6,
      indexSize: 512 * 1024, // 512KB
    },
  ];

  const mockProps = {
    directories: mockDirectories,
    onDirectoryAdded: vi.fn(),
    onDirectoryRemoved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithContext = (props = {}) => {
    return render(
      <IdeMessengerContext.Provider value={mockIdeMessenger}>
        <DirectoryList {...mockProps} {...props} />
      </IdeMessengerContext.Provider>,
    );
  };

  it("renders header and description", () => {
    renderWithContext();

    expect(screen.getByText("Indexed Directories")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage directories that are indexed for codebase search",
      ),
    ).toBeInTheDocument();
  });

  it("displays add directory button", () => {
    renderWithContext();

    const addButton = screen.getByText("Add Directory");
    expect(addButton).toBeInTheDocument();
    expect(addButton).not.toBeDisabled();
  });

  it("shows summary stats when directories exist", () => {
    renderWithContext();

    expect(screen.getByText("2 directories indexed")).toBeInTheDocument();

    // Total size should be 2MB + 512KB = 2.5MB
    expect(screen.getByText("Total index size: 2.5 MB")).toBeInTheDocument();
  });

  it("shows singular directory when only one exists", () => {
    const singleDirectory = [mockDirectories[0]];
    renderWithContext({ directories: singleDirectory });

    expect(screen.getByText("1 directory indexed")).toBeInTheDocument();
    expect(screen.getByText("Total index size: 2.0 MB")).toBeInTheDocument();
  });

  it("handles add directory action", async () => {
    mockIdeMessenger.request.mockResolvedValue({ path: "/new/directory" });

    renderWithContext();

    const addButton = screen.getByText("Add Directory");
    fireEvent.click(addButton);

    expect(addButton).toHaveTextContent("Adding...");
    expect(addButton).toBeDisabled();

    expect(mockIdeMessenger.request).toHaveBeenCalledWith(
      "selectDirectory",
      undefined,
    );

    await waitFor(() => {
      expect(mockIdeMessenger.post).toHaveBeenCalledWith(
        "index/addDirectoryToIndex",
        { path: "/new/directory" },
      );
    });

    await waitFor(() => {
      expect(mockProps.onDirectoryAdded).toHaveBeenCalledWith("/new/directory");
    });

    await waitFor(() => {
      expect(screen.getByText("Add Directory")).toBeInTheDocument();
      expect(screen.getByText("Add Directory")).not.toBeDisabled();
    });
  });

  it("handles cancelled directory selection", async () => {
    mockIdeMessenger.request.mockResolvedValue(null);

    renderWithContext();

    const addButton = screen.getByText("Add Directory");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockProps.onDirectoryAdded).not.toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("Add Directory")).not.toBeDisabled();
    });
  });

  it("handles add directory error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockIdeMessenger.request.mockRejectedValue(new Error("Selection failed"));

    renderWithContext();

    const addButton = screen.getByText("Add Directory");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to add directory:",
        expect.any(Error),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Add Directory")).not.toBeDisabled();
    });

    consoleSpy.mockRestore();
  });

  it("displays management action buttons", () => {
    renderWithContext();

    expect(screen.getByText("Refresh All")).toBeInTheDocument();
    expect(screen.getByText("Pause All")).toBeInTheDocument();
    expect(screen.getByText("Resume All")).toBeInTheDocument();
  });

  it("handles refresh all action", () => {
    renderWithContext();

    const refreshButton = screen.getByText("Refresh All");
    fireEvent.click(refreshButton);

    expect(mockIdeMessenger.post).toHaveBeenCalledWith(
      "index/refreshAllDirectories",
      undefined,
    );
  });

  it("handles pause all action", () => {
    renderWithContext();

    const pauseButton = screen.getByText("Pause All");
    fireEvent.click(pauseButton);

    expect(mockIdeMessenger.post).toHaveBeenCalledWith(
      "index/pauseAllDirectories",
      undefined,
    );
  });

  it("handles resume all action", () => {
    renderWithContext();

    const resumeButton = screen.getByText("Resume All");
    fireEvent.click(resumeButton);

    expect(mockIdeMessenger.post).toHaveBeenCalledWith(
      "index/resumeAllDirectories",
      undefined,
    );
  });

  it("does not show management buttons when no directories", () => {
    renderWithContext({ directories: [] });

    expect(screen.queryByText("Refresh All")).not.toBeInTheDocument();
    expect(screen.queryByText("Pause All")).not.toBeInTheDocument();
    expect(screen.queryByText("Resume All")).not.toBeInTheDocument();
  });

  it("does not show summary stats when no directories", () => {
    renderWithContext({ directories: [] });

    expect(screen.queryByText(/directories indexed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Total index size/)).not.toBeInTheDocument();
  });

  it("renders DirectoryIndexProgress component", () => {
    renderWithContext();

    // Should render the DirectoryIndexProgress component
    expect(screen.getByText("Directory Indexing Progress")).toBeInTheDocument();
  });

  it("calculates total size correctly", () => {
    const directoriesWithVariedSizes = [
      {
        path: "/dir1",
        status: "done" as const,
        progress: 1.0,
        indexSize: 1024 * 1024, // 1MB
      },
      {
        path: "/dir2",
        status: "done" as const,
        progress: 1.0,
        indexSize: 1024 * 1024 * 1.5, // 1.5MB
      },
      {
        path: "/dir3",
        status: "done" as const,
        progress: 1.0,
        indexSize: 512 * 1024, // 512KB
      },
    ];

    renderWithContext({ directories: directoriesWithVariedSizes });

    // Total: 1MB + 1.5MB + 512KB = 3MB
    expect(screen.getByText("Total index size: 3.0 MB")).toBeInTheDocument();
  });

  it("handles zero-size directories", () => {
    const directoriesWithZeroSize = [
      {
        path: "/empty",
        status: "done" as const,
        progress: 1.0,
        indexSize: 0,
      },
    ];

    renderWithContext({ directories: directoriesWithZeroSize });

    expect(screen.getByText("Total index size: 0 B")).toBeInTheDocument();
  });

  it("handles directories without size data", () => {
    const directoriesWithoutSize = [
      {
        path: "/unknown",
        status: "loading" as const,
        progress: 0.0,
      },
    ];

    renderWithContext({ directories: directoriesWithoutSize });

    expect(screen.getByText("Total index size: 0 B")).toBeInTheDocument();
  });
});
