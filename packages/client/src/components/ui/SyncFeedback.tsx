import * as React from "react";
import { useSync, useUIActions } from '../../stores/enhancedAppStore';
import { ERROR_MESSAGES } from '@game/shared';


/**
 * Effect-only component that surfaces user feedback for sync operations using the new event-driven sync system.
 * - On transition syncing -> idle: show a success toast with counts/duration when available
 * - On transition to error: show an error toast (lastError when present)
 *
 * This does not render visible UI. Mount it once near the app root.
 */
const SyncFeedback: React.FC = () => {
  const sync = useSync();
  const { addToast } = useUIActions();
  
  const status = sync.status;

  const prevStateRef = React.useRef<"idle" | "syncing" | "error">(status.state);
  const prevQueuedRef = React.useRef<number>(status.queuedCount);
  const prevRunAtRef = React.useRef<number | undefined>(status.lastRunAt);

  React.useEffect(() => {
    const prevState = prevStateRef.current;

    // Transition: error state entered
    if (status.state === "error" && prevState !== "error") {
      const message = status.lastError ? String(status.lastError) : ERROR_MESSAGES.SYNC_ERROR;
      addToast({ type: "error", message, duration: 4000 });
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

      addToast({ type: "success", message: text, duration: 3000 });
    }

    // For auto sync, also show feedback on initial sync completion
    if (sync.autoSyncEnabled && prevState === "idle" && status.state === "idle") {
      // Check if we have a successful sync that just completed
      const hasRecentSync = 
        typeof status.lastRunAt === "number" && 
        status.lastRunAt !== prevRunAtRef.current &&
        Date.now() - status.lastRunAt < 5000; // Within last 5 seconds

      if (hasRecentSync && !status.lastError) {
        const processed = Math.max(0, prevQueuedRef.current - status.queuedCount);
        if (processed > 0) {
          let text = `Event sync: ${processed} ${processed === 1 ? "action" : "actions"}`;
          if (typeof status.lastDurationMs === "number" && status.lastDurationMs >= 0) {
            const sec = Math.max(0.1, Math.round(status.lastDurationMs / 100) / 10);
            text += ` (${sec}s)`;
          }
          addToast({ type: "success", message: text, duration: 2000 });
        }
      }
    }

    // Persist previous snapshot
    prevStateRef.current = status.state;
    prevQueuedRef.current = status.queuedCount;
    prevRunAtRef.current = status.lastRunAt;
  }, [status, addToast, sync.autoSyncEnabled]);

  return null;
};

export default SyncFeedback;


