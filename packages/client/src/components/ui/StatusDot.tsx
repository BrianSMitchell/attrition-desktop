import * as React from "react";
import { ERROR_TEXT, DISPLAY_TEXT } from '@game/shared';

type SyncState = "idle" | "syncing" | "error" | "online" | "offline" | "degraded" | "loading";

interface Props {
  state: SyncState;
  queuedCount?: number;
  showLabel?: boolean; // default false; show label for syncing/error to reduce noise
  size?: "xs" | "sm" | "md" | "lg";
  title?: string;
  className?: string;
  animate?: boolean; // Explicit control for animation
}

const StatusDot: React.FC<Props> = ({
  state,
  queuedCount,
  showLabel = false,
  size = "sm",
  title,
  className,
  animate,
}) => {
  const getLabel = () => {
    switch (state) {
      case "syncing": return "Syncing…";
      case "error": return ERROR_TEXT.ERROR;
      case "online": return DISPLAY_TEXT.ONLINE;
      case "offline": return DISPLAY_TEXT.OFFLINE;
      case "degraded": return "Limited";
      case "loading": return "Loading…";
      default: return "Synced";
    }
  };

  const getDotSizeClass = () => {
    switch (size) {
      case "xs": return "w-1.5 h-1.5";
      case "sm": return "w-2 h-2";
      case "md": return "w-3 h-3";
      case "lg": return "w-4 h-4";
      default: return "w-2 h-2";
    }
  };

  // Colors for different states
  const getBaseColorClass = () => {
    switch (state) {
      case "error": return "bg-red-400";
      case "offline": return "bg-red-500";
      case "online": return "bg-green-400";
      case "degraded": return "bg-yellow-400";
      case "loading": return "bg-gray-400";
      case "syncing":
      case "idle":
      default:
        return "bg-blue-400";
    }
  };

  const shouldAnimate = animate || (state === "syncing" || state === "loading");
  const pulseClass = shouldAnimate ? "animate-pulse" : "";

  const getLabelColorClass = () => {
    switch (state) {
      case "error": return "text-red-400";
      case "offline": return "text-red-500";
      case "online": return "text-green-400";
      case "degraded": return "text-yellow-400";
      case "loading": return "text-gray-400";
      default: return "text-blue-400";
    }
  };

  const getAriaLabel = () => {
    switch (state) {
      case "syncing": return "Syncing";
      case "error": return ERROR_TEXT.ERROR;
      case "online": return DISPLAY_TEXT.ONLINE;
      case "offline": return DISPLAY_TEXT.OFFLINE;
      case "degraded": return "Limited";
      case "loading": return "Loading";
      default: return "Synced";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-2 ${className || ""}`}
      role="status"
      aria-label={getAriaLabel()}
      title={title || getLabel()}
    >
      <span className={`${getDotSizeClass()} rounded-full ${getBaseColorClass()} ${pulseClass}`} />
      {showLabel && (
        <span className={`text-xs ${getLabelColorClass()}`}>
          {getLabel()}
          {(state === "syncing" || state === "degraded") && typeof queuedCount === "number" && queuedCount > 0
            ? ` (${queuedCount})`
            : null}
        </span>
      )}
    </span>
  );
};

export default StatusDot;