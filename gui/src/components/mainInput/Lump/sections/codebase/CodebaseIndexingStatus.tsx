import type { IndexingStatus } from "core";
import {
  CodebaseIndexSizeDisplay,
  useShouldShowSize,
} from "../../../../IndexSize/IndexSizeDisplay";
import { StatusIndicator } from "../docs/StatusIndicator";

interface CodebaseIndexingStatusProps {
  indexKey: string;
  status: IndexingStatus;
}

export default function CodebaseIndexingStatus({
  indexKey,
  status,
}: CodebaseIndexingStatusProps) {
  const shouldShowSize = useShouldShowSize(status.status);

  // Extract a display name from the index key
  const displayName = indexKey.split("/").pop() || indexKey;

  return (
    <div className="flex items-center gap-2 py-1">
      <StatusIndicator status={status.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium" title={indexKey}>
            {displayName}
          </span>
          {shouldShowSize && status.sizeInfo && (
            <CodebaseIndexSizeDisplay
              sizeInfo={status.sizeInfo}
              isLoading={status.status === "indexing"}
              className="text-xs"
            />
          )}
        </div>
        {status.status === "failed" && status.description && (
          <div className="text-error mt-0.5 text-xs" title={status.description}>
            {status.description}
          </div>
        )}
        {status.status === "indexing" && status.progress !== undefined && (
          <div className="text-description mt-0.5 text-xs">
            Progress: {Math.round(status.progress * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}
