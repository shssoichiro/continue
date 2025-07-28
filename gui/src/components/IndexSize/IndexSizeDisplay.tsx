import { varWithFallback } from "../../styles/theme";
import { SizeInfo, safeFormatSizeAndCount } from "./SizeFormatter";
import {
  CompactSizeSkeletonLoader,
  SizeSkeletonLoader,
} from "./SkeletonLoader";

interface IndexSizeDisplayProps {
  /** Size and count information */
  sizeInfo?: SizeInfo;
  /** Type of items being displayed */
  type: "files" | "pages";
  /** Whether the size is currently being calculated */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to use compact display (single line) */
  compact?: boolean;
  /** Custom fallback text when size is unavailable */
  fallbackText?: string;
  /** Test ID for testing */
  "data-testid"?: string;
}

/**
 * Component to display index size and count information in a subtle, unobtrusive way.
 * Designed to show below indexing items with muted styling to avoid visual clutter.
 */
export function IndexSizeDisplay({
  sizeInfo,
  type,
  isLoading = false,
  className = "",
  compact = false,
  fallbackText = "Size unavailable",
  "data-testid": testId,
}: IndexSizeDisplayProps) {
  // Base styles using Continue's theme system
  const baseStyles = {
    color: varWithFallback("description-muted"),
    fontSize: "10px",
    lineHeight: "14px",
  };

  if (isLoading) {
    return (
      <div
        className={`mt-1 ${className}`}
        style={baseStyles}
        data-testid={testId}
        role="status"
        aria-label="Loading size information"
      >
        {compact ? <CompactSizeSkeletonLoader /> : <SizeSkeletonLoader />}
      </div>
    );
  }

  const formattedText = safeFormatSizeAndCount(sizeInfo, type, fallbackText);

  return (
    <div
      className={`mt-1 ${className}`}
      style={baseStyles}
      data-testid={testId}
      role="status"
      aria-label={`Index size: ${formattedText}`}
    >
      <span className="select-none">{formattedText}</span>
    </div>
  );
}

/**
 * Specialized component for docs indexing size display
 */
export function DocsIndexSizeDisplay({
  sizeInfo,
  isLoading,
  className,
  ...props
}: Omit<IndexSizeDisplayProps, "type">) {
  return (
    <IndexSizeDisplay
      sizeInfo={sizeInfo}
      type="pages"
      isLoading={isLoading}
      className={className}
      {...props}
    />
  );
}

/**
 * Specialized component for codebase indexing size display
 */
export function CodebaseIndexSizeDisplay({
  sizeInfo,
  isLoading,
  className,
  ...props
}: Omit<IndexSizeDisplayProps, "type">) {
  return (
    <IndexSizeDisplay
      sizeInfo={sizeInfo}
      type="files"
      isLoading={isLoading}
      className={className}
      {...props}
    />
  );
}

/**
 * Hook to determine if size should be displayed based on status
 */
export function useShouldShowSize(status?: string): boolean {
  // Only show size for completed indexing to avoid clutter during progress
  return status === "complete" || status === "done";
}
