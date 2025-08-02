import { IndexingProgressUpdate } from "core";
import { useContext, useEffect, useState } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { useWebviewListener } from "../../hooks/useWebviewListener";
import { DirectoryIndexStatus } from "./DirectoryIndexStatus";

export interface DirectoryIndexInfo {
  path: string;
  status: IndexingProgressUpdate["status"];
  progress: number;
  lastIndexed?: Date;
  indexSize?: number;
  errorMessage?: string;
}

export interface DirectoryIndexProgressProps {
  directories?: DirectoryIndexInfo[];
  onDirectoryRetry?: (path: string) => void;
  onDirectoryPause?: (path: string) => void;
  onDirectoryResume?: (path: string) => void;
}

export function DirectoryIndexProgress({
  directories = [],
  onDirectoryRetry,
  onDirectoryPause,
  onDirectoryResume,
}: DirectoryIndexProgressProps) {
  const ideMessenger = useContext(IdeMessengerContext);
  const [directoryStatuses, setDirectoryStatuses] =
    useState<DirectoryIndexInfo[]>(directories);

  useWebviewListener(
    "directoryIndexProgress",
    async (data: DirectoryIndexInfo[]) => {
      setDirectoryStatuses(data);
    },
  );

  useEffect(() => {
    // Request initial directory index statuses
    ideMessenger.post("index/getDirectoryIndexStatuses", undefined);
  }, [ideMessenger]);

  const handleDirectoryRetry = (path: string) => {
    ideMessenger.post("index/retryDirectoryIndex", { path });
    onDirectoryRetry?.(path);
  };

  const handleDirectoryPause = (path: string) => {
    ideMessenger.post("index/pauseDirectoryIndex", { path });
    onDirectoryPause?.(path);
  };

  const handleDirectoryResume = (path: string) => {
    ideMessenger.post("index/resumeDirectoryIndex", { path });
    onDirectoryResume?.(path);
  };

  const getOverallProgress = () => {
    if (directoryStatuses.length === 0) return 0;

    const totalProgress = directoryStatuses.reduce((sum, dir) => {
      return sum + (dir.progress || 0);
    }, 0);

    return totalProgress / directoryStatuses.length;
  };

  const getActiveCount = () => {
    return directoryStatuses.filter(
      (dir) => dir.status === "indexing" || dir.status === "loading",
    ).length;
  };

  const getCompletedCount = () => {
    return directoryStatuses.filter((dir) => dir.status === "done").length;
  };

  const getFailedCount = () => {
    return directoryStatuses.filter((dir) => dir.status === "failed").length;
  };

  const overallProgress = getOverallProgress();
  const activeCount = getActiveCount();
  const completedCount = getCompletedCount();
  const failedCount = getFailedCount();

  return (
    <div className="space-y-4">
      {/* Overall Progress Summary */}
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Directory Indexing Progress
          </h3>
          <span className="text-xs text-gray-500">
            {Math.round(overallProgress * 100)}% complete
          </span>
        </div>

        <div className="mb-3 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${overallProgress * 100}%` }}
          />
        </div>

        <div className="flex gap-4 text-xs text-gray-600">
          <span>{completedCount} completed</span>
          {activeCount > 0 && <span>{activeCount} indexing</span>}
          {failedCount > 0 && (
            <span className="text-red-600">{failedCount} failed</span>
          )}
        </div>
      </div>

      {/* Individual Directory Statuses */}
      <div className="space-y-2">
        {directoryStatuses.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p className="text-sm">
              No directories being tracked for indexing.
            </p>
            <p className="mt-1 text-xs">
              Directories will appear here when indexing is enabled.
            </p>
          </div>
        ) : (
          directoryStatuses.map((directory) => (
            <DirectoryIndexStatus
              key={directory.path}
              directoryPath={directory.path}
              status={directory.status}
              progress={directory.progress}
              lastIndexed={directory.lastIndexed}
              indexSize={directory.indexSize}
              errorMessage={directory.errorMessage}
              onRetry={handleDirectoryRetry}
              onPause={handleDirectoryPause}
              onResume={handleDirectoryResume}
            />
          ))
        )}
      </div>
    </div>
  );
}
