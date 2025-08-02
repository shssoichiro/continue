import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { DirectoryIndexStatus } from "./DirectoryIndexStatus";

describe("DirectoryIndexStatus", () => {
  const mockProps = {
    directoryPath: "/test/directory",
    status: "done" as const,
    progress: 1.0,
    lastIndexed: new Date("2024-01-01T12:00:00Z"),
    indexSize: 1024 * 1024, // 1MB
    onRetry: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders directory path and status", () => {
    render(<DirectoryIndexStatus {...mockProps} />);

    expect(screen.getByText("/test/directory")).toBeInTheDocument();
    expect(screen.getByText("Indexed")).toBeInTheDocument();
  });

  it("displays size information", () => {
    render(<DirectoryIndexStatus {...mockProps} />);

    // Should show size display component
    expect(screen.getByText("1.0 MB")).toBeInTheDocument();
  });

  it("shows progress bar for indexing status", () => {
    render(
      <DirectoryIndexStatus {...mockProps} status="indexing" progress={0.5} />,
    );

    expect(screen.getByText("Indexing")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();

    // Check progress bar
    const progressBar = document.querySelector(".bg-blue-500");
    expect(progressBar).toHaveStyle({ width: "50%" });
  });

  it("shows red progress bar for failed status", () => {
    render(
      <DirectoryIndexStatus
        {...mockProps}
        status="failed"
        errorMessage="Test error"
      />,
    );

    expect(screen.getByText("Failed")).toBeInTheDocument();

    // Check failed progress bar
    const progressBar = document.querySelector(".bg-red-500");
    expect(progressBar).toHaveStyle({ width: "100%" });
  });

  it("displays loading state for indexing", () => {
    render(
      <DirectoryIndexStatus {...mockProps} status="indexing" progress={0.3} />,
    );

    // IndexSizeDisplay should show loading state
    expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
  });

  it("calls onRetry when retry is triggered from tooltip", () => {
    render(
      <DirectoryIndexStatus
        {...mockProps}
        status="failed"
        errorMessage="Test error"
      />,
    );

    // Find and hover over the status to show tooltip
    const statusElement = screen.getByText("Failed");
    fireEvent.mouseEnter(statusElement);

    // Should show tooltip with retry button
    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    expect(mockProps.onRetry).toHaveBeenCalledWith("/test/directory");
  });

  it("calls onPause when pause is triggered from tooltip", () => {
    render(
      <DirectoryIndexStatus {...mockProps} status="indexing" progress={0.5} />,
    );

    // Find and hover over the status to show tooltip
    const statusElement = screen.getByText("Indexing");
    fireEvent.mouseEnter(statusElement);

    // Should show tooltip with pause button
    const pauseButton = screen.getByText("Pause");
    fireEvent.click(pauseButton);

    expect(mockProps.onPause).toHaveBeenCalledWith("/test/directory");
  });

  it("calls onResume when resume is triggered from tooltip", () => {
    render(
      <DirectoryIndexStatus {...mockProps} status="paused" progress={0.3} />,
    );

    // Find and hover over the status to show tooltip
    const statusElement = screen.getByText("Paused");
    fireEvent.mouseEnter(statusElement);

    // Should show tooltip with resume button
    const resumeButton = screen.getByText("Resume");
    fireEvent.click(resumeButton);

    expect(mockProps.onResume).toHaveBeenCalledWith("/test/directory");
  });

  it("applies correct status colors", () => {
    const { rerender } = render(<DirectoryIndexStatus {...mockProps} />);

    // Test "done" status color
    expect(screen.getByText("Indexed")).toHaveClass("text-green-500");

    // Test "indexing" status color
    rerender(
      <DirectoryIndexStatus {...mockProps} status="indexing" progress={0.5} />,
    );
    expect(screen.getByText("Indexing")).toHaveClass("text-blue-500");

    // Test "failed" status color
    rerender(<DirectoryIndexStatus {...mockProps} status="failed" />);
    expect(screen.getByText("Failed")).toHaveClass("text-red-500");

    // Test "paused" status color
    rerender(
      <DirectoryIndexStatus {...mockProps} status="paused" progress={0.3} />,
    );
    expect(screen.getByText("Paused")).toHaveClass("text-yellow-500");
  });

  it("truncates long directory paths", () => {
    const longPath =
      "/very/very/very/long/directory/path/that/should/be/truncated";
    render(<DirectoryIndexStatus {...mockProps} directoryPath={longPath} />);

    const pathElement = screen.getByText(longPath);
    expect(pathElement).toHaveClass("truncate");
  });
});
