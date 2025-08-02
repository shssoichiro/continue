import { IndexingProgressUpdate } from "core";
import { useCallback } from "react";
import { IndexSizeDisplay } from "../../components/IndexSize/IndexSizeDisplay";
import { StatusTooltip } from "../../components/StatusTooltip";

export interface DirectoryIndexStatusProps {
  directoryPath: string;
  status: IndexingProgressUpdate["status"];
  progress: number;
  lastIndexed?: Date;
  indexSize?: number;
  errorMessage?: string;
  onRetry?: (path: string) => void;
  onPause?: (path: string) => void;
  onResume?: (path: string) => void;
}

export function DirectoryIndexStatus({
  directoryPath,
  status,
  progress,
  lastIndexed,
  indexSize,
  errorMessage,
  onRetry,
  onPause,
  onResume,
}: DirectoryIndexStatusProps) {
  const handleRetry = useCallback(() => {
    onRetry?.(directoryPath);
  }, [directoryPath, onRetry]);

  const handlePause = useCallback(() => {
    onPause?.(directoryPath);
  }, [directoryPath, onPause]);

  const handleResume = useCallback(() => {
    onResume?.(directoryPath);
  }, [directoryPath, onResume]);

  const getStatusColor = (status: IndexingProgressUpdate["status"]) => {
    switch (status) {
      case "done":
        return "text-green-500";
      case "indexing":
        return "text-blue-500";
      case "failed":
        return "text-red-500";
      case "paused":
        return "text-yellow-500";
      case "disabled":
        return "text-gray-400";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = (status: IndexingProgressUpdate["status"]) => {
    switch (status) {
      case "done":
        return "Indexed";
      case "indexing":
        return "Indexing";
      case "failed":
        return "Failed";
      case "paused":
        return "Paused";
      case "disabled":
        return "Disabled";
      case "loading":
        return "Loading";
      case "waiting":
        return "Waiting";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const progressPercentage = Math.min(100, Math.max(0, progress * 100));

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-gray-900">
            {directoryPath}
          </span>
          <StatusTooltip
            status={status}
            lastIndexed={lastIndexed}
            errorMessage={errorMessage}
            onRetry={handleRetry}
            onPause={handlePause}
            onResume={handleResume}
          >
            <span className={`text-xs font-medium ${getStatusColor(status)}`}>
              {getStatusText(status)}
            </span>
          </StatusTooltip>
        </div>

        {status === "indexing" && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all duration-200"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        {status === "failed" && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
            <div className="h-1.5 w-full rounded-full bg-red-500" />
          </div>
        )}
      </div>

      <div className="ml-4 flex items-center gap-3">
        {indexSize !== undefined && (
          <IndexSizeDisplay
            sizeInfo={{ size: indexSize }}
            type="files"
            isLoading={status === "indexing" || status === "loading"}
            className="text-xs text-gray-500"
          />
        )}

        {status === "indexing" && (
          <span className="text-xs text-gray-500">
            {progressPercentage.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
