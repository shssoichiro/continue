import { useState } from "react";
import { DirectoryIndexInfo } from "./DirectoryIndexProgress";
import { DirectoryList } from "./DirectoryList";

export function CodebaseSection() {
  const [directories, setDirectories] = useState<DirectoryIndexInfo[]>([
    // Mock data for development - this will be replaced with real data
    {
      path: "/home/user/projects/my-app/src",
      status: "done",
      progress: 1.0,
      lastIndexed: new Date(Date.now() - 3600000), // 1 hour ago
      indexSize: 1024 * 1024 * 2.5, // 2.5MB
    },
    {
      path: "/home/user/projects/my-app/tests",
      status: "indexing",
      progress: 0.65,
      indexSize: 1024 * 512, // 512KB
    },
    {
      path: "/home/user/projects/shared-lib",
      status: "failed",
      progress: 0.3,
      errorMessage: "Permission denied accessing directory",
    },
    {
      path: "/home/user/projects/docs",
      status: "paused",
      progress: 0.8,
      indexSize: 1024 * 256, // 256KB
    },
  ]);

  const handleDirectoryAdded = (path: string) => {
    setDirectories((prev) => [
      ...prev,
      {
        path,
        status: "loading",
        progress: 0,
      },
    ]);
  };

  const handleDirectoryRemoved = (path: string) => {
    setDirectories((prev) => prev.filter((dir) => dir.path !== path));
  };

  return (
    <div className="py-5">
      <div className="mb-6">
        <h2 className="mx-auto mb-1 mt-0 text-xl">Codebase Index</h2>
        <span className="text-lightgray w-3/4 text-xs">
          Manage directories that are indexed for codebase search and
          understanding
        </span>
      </div>

      <DirectoryList
        directories={directories}
        onDirectoryAdded={handleDirectoryAdded}
        onDirectoryRemoved={handleDirectoryRemoved}
      />
    </div>
  );
}
