import * as React from "react";
import { useSync } from "../../contexts/SyncContext";
import { useToast } from "../../contexts/ToastContext";

/**
 * Effect-only component that surfaces user feedback for sync operations.
 * - On transition syncing -> idle: show a success toast with counts/duration when available
 * - On transition to error: show an error toast (lastError when present)
 *
 * This does not render visible UI. Mount it once near the app root.
 */
const SyncFeedback: React.FC = () => {
  const { status } = useSync();
  const { addToast } = useToast();

  const prevStateRef = React.useRef<"idle" | "syncing" | "error">(status.state);
  const prevQueuedRef = React.useRef<number>(status.queuedCount);
  const prevRunAtRef = React.useRef<number | undefined>(status.lastRunAt);

  React.useEffect(() => {
    const prevState = prevStateRef.current;

    // Transition: error state entered
    if (status.state === "error" && prevState !== "error") {
      const message = status.lastError ? String(status.lastError) : "Sync error";
      addToast({ type: "error", text: message, durationMs: 4000 });
    }

    // Transition: syncing -> idle (completed a cycle)
    if (prevState === "syncing" && status.state === "idle") {
      // Heuristics: count of flushed = previous queued (approx) if it dropped to 0; otherwise show generic completion
      const flushed = prevQueuedRef.current || 0;
      const hasNewRun =
        typeof status.lastRunAt === "number" &&
        status.lastRunAt !== prevRunAtRef.current;

      let text = "Sync complete";
      if (flushed > 0) {
        text = `Synced ${flushed} ${flushed === 1 ? "action" : "actions"}`;
      } else if (hasNewRun) {
        text = "Sync up to date";
      }

      if (typeof status.lastDurationMs === "number" && status.lastDurationMs >= 0) {
        const sec = Math.max(0.1, Math.round(status.lastDurationMs / 100) / 10);
        text += ` (${sec}s)`;
      }

      addToast({ type: "success", text, durationMs: 3000 });
    }

    // Persist previous snapshot
    prevStateRef.current = status.state;
    prevQueuedRef.current = status.queuedCount;
    prevRunAtRef.current = status.lastRunAt;
  }, [status, addToast]);

  return null;
};

export default SyncFeedback;
