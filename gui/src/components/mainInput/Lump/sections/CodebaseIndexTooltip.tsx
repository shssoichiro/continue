import { IndexingProgressUpdate } from "core";

export interface CodebaseIndexTooltipProps {
  status: IndexingProgressUpdate;
}

export const CodebaseIndexTooltip = (props: CodebaseIndexTooltipProps) => {
  return (
    <div>
      <span>{props.status.desc}</span>
    </div>
  );
};
