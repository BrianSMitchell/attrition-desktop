/**
 * Centralized formatter for idempotent start conflicts across services.
 * Standardizes the ALREADY_IN_PROGRESS DTO per .clinerules/dto-error-schema-and-logging.md
 * and .clinerules/queue-idempotency.md.
 */

export type QueueType = 'structures' | 'defenses' | 'units' | 'research';

export interface ExistingQueuedInfo {
  _id?: string;
  state?: 'queued' | 'pending' | 'active';
  startedAt?: Date | string;
  etaSeconds?: number;
  catalogKey?: string;
}

/**
 * Returns a canonical error DTO for idempotent conflicts.
 * - success: false
 * - code: 'ALREADY_IN_PROGRESS'
 * - message/error: 'An identical item is already queued or active.'
 * - details: { queueType, identityKey, catalogKey, existing? }
 */
export function formatAlreadyInProgress(
  queueType: QueueType,
  identityKey: string,
  catalogKey: string,
  existing?: ExistingQueuedInfo
) {
  const message = 'An identical item is already queued or active.';
  return {
    success: false as const,
    code: 'ALREADY_IN_PROGRESS',
    message,
    error: message,
    details: {
      queueType,
      identityKey,
      catalogKey,
      ...(existing ? { existing } : {})
    }
  };
}
