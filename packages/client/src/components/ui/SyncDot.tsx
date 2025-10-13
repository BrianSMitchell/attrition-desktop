import * as React from "react";
import { ERROR_MESSAGES } from '../../server/src/constants/response-formats';


type SyncState = "idle" | "syncing" | "error";

interface Props {
  state: SyncState;
  queuedCount?: number;
  showLabel?: boolean; // default false; show label for syncing/error to reduce noise
  size?: "sm" | "md";
  title?: string;
  className?: string;
}

const SyncDot: React.FC<Props> = ({
  state,
  queuedCount,
  showLabel = false,
  size = "sm",
  title,
  className,
}) => {
  const label =
    state === "syncing" ? "Syncing…" : state === "error" ? ERROR_MESSAGES.SYNC_ERROR : "Synced";

  const dotSizeClass = size === "md" ? "w-3 h-3" : "w-2 h-2";

  // Colors (dark UI): idle → blue, syncing → blue + pulse, error → red
  const baseColorClass =
    state === "error" ? "bg-red-400" : "bg-blue-400";
  const pulseClass = state === "syncing" ? "animate-pulse" : "";

  const labelColorClass =
    state === "error" ? "text-red-400" : "text-blue-400";

  const aria = state === "syncing" ? "Syncing" : state === "error" ? ERROR_MESSAGES.SYNC_ERROR : "Synced";

  return (
    <span
      className={`inline-flex items-center gap-2 ${className || ""}`}
      role="status"
      aria-label={aria}
      title={title || label}
    >
      <span className={`${dotSizeClass} rounded-full ${baseColorClass} ${pulseClass}`} />
      {showLabel && (
        <span className={`text-xs ${labelColorClass}`}>
          {label}
          {state === "syncing" && typeof queuedCount === "number" && queuedCount > 0
            ? ` (${queuedCount})`
            : null}
        </span>
      )}
    </span>
  );
};

export default SyncDot;


