import * as React from "react";

type State = "online" | "degraded" | "offline";

interface Props {
  state: State;
  showLabel?: boolean;
  size?: "sm" | "md";
  title?: string;
  className?: string;
}

export const StatusDot: React.FC<Props> = ({
  state,
  showLabel = false,
  size = "sm",
  title,
  className,
}) => {
  const colorClass =
    state === "online"
      ? "bg-green-400"
      : state === "degraded"
      ? "bg-yellow-400"
      : "bg-red-400";

  const label =
    state === "online" ? "Online" : state === "degraded" ? "Degraded" : "Offline";

  const dotSizeClass = size === "md" ? "w-3 h-3" : "w-2 h-2";
  const labelColorClass =
    state === "online"
      ? "text-green-400"
      : state === "degraded"
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <span
      className={`inline-flex items-center gap-2 ${className || ""}`}
      role="status"
      aria-label={label}
      title={title || label}
    >
      <span className={`${dotSizeClass} rounded-full ${colorClass}`} />
      {showLabel && <span className={`text-xs ${labelColorClass}`}>{label}</span>}
    </span>
  );
};

export default StatusDot;
