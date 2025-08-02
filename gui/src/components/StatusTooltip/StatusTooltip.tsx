import { IndexingProgressUpdate } from "core";
import { ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { ToolTip } from "../gui/Tooltip";

export interface StatusTooltipProps {
  status: IndexingProgressUpdate["status"];
  lastIndexed?: Date;
  errorMessage?: string;
  onRetry?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  children: ReactNode;
}

export function StatusTooltip({
  status,
  lastIndexed,
  errorMessage,
  onRetry,
  onPause,
  onResume,
  children,
}: StatusTooltipProps) {
  const tooltipId = `status-tooltip-${uuidv4()}`;
  const getTooltipContent = () => {
    switch (status) {
      case "done":
        return (
          <div className="p-2">
            <div className="font-medium text-green-400">Indexing Complete</div>
            {lastIndexed && (
              <div className="mt-1 text-xs text-gray-300">
                Last indexed: {lastIndexed.toLocaleString()}
              </div>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-xs text-blue-400 underline hover:text-blue-300"
              >
                Re-index
              </button>
            )}
          </div>
        );
      case "indexing":
        return (
          <div className="p-2">
            <div className="font-medium text-blue-400">
              Indexing in Progress
            </div>
            <div className="mt-1 text-xs text-gray-300">
              Processing files and building search index...
            </div>
            {onPause && (
              <button
                onClick={onPause}
                className="mt-2 text-xs text-yellow-400 underline hover:text-yellow-300"
              >
                Pause
              </button>
            )}
          </div>
        );
      case "failed":
        return (
          <div className="p-2">
            <div className="font-medium text-red-400">Indexing Failed</div>
            {errorMessage && (
              <div className="mt-1 max-w-xs text-xs text-gray-300">
                {errorMessage}
              </div>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-xs text-blue-400 underline hover:text-blue-300"
              >
                Retry
              </button>
            )}
          </div>
        );
      case "paused":
        return (
          <div className="p-2">
            <div className="font-medium text-yellow-400">Indexing Paused</div>
            <div className="mt-1 text-xs text-gray-300">
              Indexing has been paused and can be resumed.
            </div>
            {onResume && (
              <button
                onClick={onResume}
                className="mt-2 text-xs text-green-400 underline hover:text-green-300"
              >
                Resume
              </button>
            )}
          </div>
        );
      case "disabled":
        return (
          <div className="p-2">
            <div className="font-medium text-gray-400">Indexing Disabled</div>
            <div className="mt-1 text-xs text-gray-300">
              Indexing is currently disabled in settings.
            </div>
          </div>
        );
      default:
        return (
          <div className="p-2">
            <div className="font-medium text-gray-400">Status: {status}</div>
          </div>
        );
    }
  };

  return (
    <>
      <span data-tooltip-id={tooltipId}>{children}</span>
      <ToolTip id={tooltipId}>{getTooltipContent()}</ToolTip>
    </>
  );
}
