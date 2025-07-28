import { useMemo } from "react";
import { useAppSelector } from "../../../../../redux/hooks";
import { ExploreBlocksButton } from "../ExploreBlocksButton";
import CodebaseIndexingStatus from "./CodebaseIndexingStatus";

function CodebaseIndexingStatuses() {
  const indexingStatuses = useAppSelector(
    (store) => store.indexing.indexing.statuses,
  );

  // Filter for codebase-related indexing statuses
  const codebaseStatuses = useMemo(() => {
    return Object.entries(indexingStatuses).filter(([key]) => {
      // Filter for codebase entries (not docs)
      // Docs typically use http/https URLs, while codebase uses local paths or file:// URLs
      return !key.startsWith("http://") && !key.startsWith("https://");
    });
  }, [indexingStatuses]);

  const sortedCodebaseStatuses = useMemo(() => {
    const sorter = (status: string) => {
      if (status === "complete") return 0;
      if (status === "indexing" || status === "paused") return 1;
      if (status === "failed") return 2;
      if (status === "aborted" || status === "pending") return 3;
      return 4;
    };

    const statuses = [...codebaseStatuses];
    statuses.sort(([, statusA], [, statusB]) => {
      const statusValueA = statusA.status ?? "pending";
      const statusValueB = statusB.status ?? "pending";
      return sorter(statusValueA) - sorter(statusValueB);
    });
    return statuses;
  }, [codebaseStatuses]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col overflow-y-auto overflow-x-hidden pr-2">
        {sortedCodebaseStatuses.length > 0 ? (
          sortedCodebaseStatuses.map(([key, status]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="flex-grow">
                <CodebaseIndexingStatus indexKey={key} status={status} />
              </div>
            </div>
          ))
        ) : (
          <div className="text-description flex items-center justify-center py-4 text-sm">
            No codebase indexing configured
          </div>
        )}
      </div>
      <ExploreBlocksButton blockType="codebase" />
    </div>
  );
}

export default CodebaseIndexingStatuses;
