// Message system types and interfaces for user-facing text

/**
 * Message severity levels for different types of user notifications
 */
export type MessageSeverity = 'success' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Game feature categories for organizing messages
 */
export type MessageCategory = 
  | 'auth'           // Authentication and login
  | 'empire'         // Empire management
  | 'building'       // Building construction and management
  | 'research'       // Technology research
  | 'fleet'          // Fleet and ship management
  | 'combat'         // Combat and warfare
  | 'trade'          // Trading and economy
  | 'diplomacy'      // Diplomatic actions
  | 'exploration'    // Exploration and colonization
  | 'system'         // System-level messages
  | 'validation'     // Input validation
  | 'network';       // Network and connectivity

/**
 * Message context for additional information
 */
export interface MessageContext {
  /** Timestamp when message was created */
  timestamp?: Date;
  /** User ID associated with the message */
  userId?: string;
  /** Empire ID associated with the message */
  empireId?: string;
  /** Location coordinate if relevant */
  locationCoord?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Base message interface
 */
export interface GameMessage {
  /** Unique message identifier */
  id: string;
  /** Message category */
  category: MessageCategory;
  /** Message severity level */
  severity: MessageSeverity;
  /** Main message text */
  message: string;
  /** Optional detailed description */
  description?: string;
  /** Message code for programmatic handling */
  code?: string;
  /** Context information */
  context?: MessageContext;
  /** Whether message should be persistent */
  persistent?: boolean;
  /** Auto-dismiss timeout in milliseconds */
  timeout?: number;
  /** Actions user can take */
  actions?: MessageAction[];
}

/**
 * Action that user can take from a message
 */
export interface MessageAction {
  /** Action identifier */
  id: string;
  /** Action label */
  label: string;
  /** Action type */
  type: 'primary' | 'secondary' | 'danger';
  /** Handler function name or route */
  handler: string;
  /** Additional parameters */
  params?: Record<string, any>;
}

/**
 * Message template for dynamic content
 */
export interface MessageTemplate {
  /** Template identifier */
  id: string;
  /** Template category */
  category: MessageCategory;
  /** Template severity */
  severity: MessageSeverity;
  /** Message template with placeholders */
  template: string;
  /** Optional description template */
  descriptionTemplate?: string;
  /** Default timeout */
  defaultTimeout?: number;
  /** Whether template creates persistent messages */
  persistent?: boolean;
  /** Template variables schema */
  variables?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
    description: string;
  }>;
}

/**
 * Message queue entry for managing display order
 */
export interface MessageQueueEntry {
  /** Queue entry ID */
  id: string;
  /** Associated message */
  message: GameMessage;
  /** Display priority (higher = more important) */
  priority: number;
  /** Queue timestamp */
  queuedAt: Date;
  /** Whether message has been shown */
  displayed: boolean;
  /** Display timestamp */
  displayedAt?: Date;
  /** Dismiss timestamp */
  dismissedAt?: Date;
}

/**
 * Message batch for grouping related messages
 */
export interface MessageBatch {
  /** Batch identifier */
  id: string;
  /** Batch title */
  title: string;
  /** Batch description */
  description?: string;
  /** Messages in batch */
  messages: GameMessage[];
  /** Batch context */
  context?: MessageContext;
  /** Created timestamp */
  createdAt: Date;
  /** Whether batch can be dismissed as a group */
  groupDismissable?: boolean;
}