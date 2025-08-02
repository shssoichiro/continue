import { FolderIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useContext, useState } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import {
  DirectoryIndexInfo,
  DirectoryIndexProgress,
} from "./DirectoryIndexProgress";

export interface DirectoryListProps {
  directories: DirectoryIndexInfo[];
  onDirectoryAdded?: (path: string) => void;
  onDirectoryRemoved?: (path: string) => void;
}

export function DirectoryList({
  directories,
  onDirectoryAdded,
  onDirectoryRemoved,
}: DirectoryListProps) {
  const ideMessenger = useContext(IdeMessengerContext);
  const [isAddingDirectory, setIsAddingDirectory] = useState(false);

  const handleAddDirectory = async () => {
    setIsAddingDirectory(true);
    try {
      // Request user to select a directory
      const result = await ideMessenger.request("selectDirectory", undefined);
      if (result && result.path) {
        // Add directory to indexing
        await ideMessenger.post("index/addDirectoryToIndex", {
          path: result.path,
        });
        onDirectoryAdded?.(result.path);
      }
    } catch (error) {
      console.error("Failed to add directory:", error);
    } finally {
      setIsAddingDirectory(false);
    }
  };

  const handleRemoveDirectory = async (path: string) => {
    try {
      await ideMessenger.post("index/removeDirectoryFromIndex", { path });
      onDirectoryRemoved?.(path);
    } catch (error) {
      console.error("Failed to remove directory:", error);
    }
  };

  const getTotalSize = () => {
    return directories.reduce((total, dir) => {
      return total + (dir.indexSize || 0);
    }, 0);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Indexed Directories
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage directories that are indexed for codebase search
          </p>
        </div>

        <button
          onClick={handleAddDirectory}
          disabled={isAddingDirectory}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          {isAddingDirectory ? "Adding..." : "Add Directory"}
        </button>
      </div>

      {/* Summary Stats */}
      {directories.length > 0 && (
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <FolderIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {directories.length}{" "}
              {directories.length === 1 ? "directory" : "directories"} indexed
            </span>
          </div>
          <div className="text-xs text-blue-700">
            Total index size: {formatBytes(getTotalSize())}
          </div>
        </div>
      )}

      {/* Directory Progress Component */}
      <DirectoryIndexProgress
        directories={directories}
        onDirectoryRetry={(path) => {
          // Handle retry logic - could emit event or refresh data
          console.log("Retrying directory:", path);
        }}
        onDirectoryPause={(path) => {
          console.log("Pausing directory:", path);
        }}
        onDirectoryResume={(path) => {
          console.log("Resuming directory:", path);
        }}
      />

      {/* Management Actions */}
      {directories.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex gap-2">
            <button
              onClick={() =>
                ideMessenger.post("index/refreshAllDirectories", undefined)
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh All
            </button>
            <button
              onClick={() =>
                ideMessenger.post("index/pauseAllDirectories", undefined)
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Pause All
            </button>
            <button
              onClick={() =>
                ideMessenger.post("index/resumeAllDirectories", undefined)
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Resume All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
