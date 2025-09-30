/**
 * Connection status indicator component
 * Shows network connection state with optional latency
 */

import React from 'react';
import StatusDot from '../StatusDot';

export interface ConnectionIndicatorProps {
  /** Connection state */
  state: 'online' | 'degraded' | 'offline';
  /** Whether to show the status label */
  showLabel?: boolean;
  /** Dot size */
  size?: 'sm' | 'md';
  /** Tooltip title */
  title?: string;
  /** Network latency in ms (shown for online state) */
  latencyMs?: number;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  state,
  showLabel = false,
  size = 'sm',
  title,
  latencyMs
}) => {
  return (
    <div className="flex items-center gap-2">
      <StatusDot
        state={state}
        showLabel={showLabel}
        size={size}
        title={title}
      />
      {state === 'online' && latencyMs && (
        <span className="text-xs text-gray-400">({latencyMs}ms)</span>
      )}
    </div>
  );
};