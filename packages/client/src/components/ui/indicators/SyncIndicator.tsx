/**
 * Sync status indicator component
 * Shows synchronization state with queue count
 */

import React from 'react';
import SyncDot from '../SyncDot';

export interface SyncIndicatorProps {
  /** Sync state */
  state: 'idle' | 'syncing' | 'error';
  /** Number of queued items */
  queuedCount: number;
  /** Whether to show the status label */
  showLabel?: boolean;
  /** Dot size */
  size?: 'sm' | 'md';
  /** Tooltip title */
  title?: string;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  state,
  queuedCount,
  showLabel = false,
  size = 'sm',
  title
}) => {
  return (
    <div className="flex items-center gap-2">
      <SyncDot
        state={state}
        queuedCount={queuedCount}
        showLabel={showLabel}
        size={size}
        title={title}
      />
    </div>
  );
};