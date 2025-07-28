interface SkeletonLoaderProps {
  className?: string;
  width?: string;
  height?: string;
  animate?: boolean;
}

/**
 * A skeleton loading component that shows a placeholder while size data is loading.
 * Designed to be subtle and unobtrusive to match the size display aesthetic.
 */
export function SkeletonLoader({
  className = "",
  width = "80px",
  height = "12px",
  animate = true,
}: SkeletonLoaderProps) {
  return (
    <div
      className={`rounded-sm bg-gray-200 ${
        animate ? "animate-pulse" : ""
      } ${className}`}
      style={{
        width,
        height,
        opacity: 0.6,
      }}
      role="progressbar"
      aria-label="Loading size information"
    />
  );
}

/**
 * A specialized skeleton loader for size and count display
 * Mimics the expected "X.X MB, Y files" format
 */
export function SizeSkeletonLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <SkeletonLoader width="35px" height="10px" />
      <span
        className="text-gray-400"
        style={{ fontSize: "10px" }}
        aria-hidden="true"
      >
        ,
      </span>
      <SkeletonLoader width="40px" height="10px" />
    </div>
  );
}

/**
 * A compact skeleton loader for inline size display
 */
export function CompactSizeSkeletonLoader({
  className = "",
}: {
  className?: string;
}) {
  return <SkeletonLoader width="70px" height="10px" className={className} />;
}
