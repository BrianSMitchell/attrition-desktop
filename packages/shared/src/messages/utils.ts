// Message utility functions for processing templates and creating dynamic messages

import { 
  GameMessage, 
  MessageTemplate, 
  MessageContext,
  MessageBatch,
  MessageQueueEntry,
  MessageSeverity,
  MessageCategory 
} from './types';

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Process a message template with variables to create a complete message
 */
export function processMessageTemplate(
  template: MessageTemplate,
  variables: Record<string, any> = {},
  context?: MessageContext
): GameMessage {
  // Validate required variables
  if (template.variables) {
    for (const [key, schema] of Object.entries(template.variables)) {
      if (schema.required && !(key in variables)) {
        throw new Error(`Required variable '${key}' is missing for template '${template.id}'`);
      }
      
      // Type validation
      if (key in variables) {
        const value = variables[key];
        const expectedType = schema.type;
        
        if (!isValidVariableType(value, expectedType)) {
          throw new Error(
            `Variable '${key}' has invalid type. Expected ${expectedType}, got ${typeof value}`
          );
        }
      }
    }
  }
  
  // Process template string
  const processedMessage = interpolateTemplate(template.template, variables);
  const processedDescription = template.descriptionTemplate 
    ? interpolateTemplate(template.descriptionTemplate, variables)
    : undefined;
  
  return {
    id: generateMessageId(),
    category: template.category,
    severity: template.severity,
    message: processedMessage,
    description: processedDescription,
    code: template.id,
    context: {
      timestamp: new Date(),
      ...context
    },
    persistent: template.persistent,
    timeout: template.defaultTimeout
  };
}

/**
 * Create a simple message without a template
 */
export function createMessage(
  category: MessageCategory,
  severity: MessageSeverity,
  message: string,
  options?: {
    description?: string;
    code?: string;
    context?: MessageContext;
    persistent?: boolean;
    timeout?: number;
    actions?: any[];
  }
): GameMessage {
  return {
    id: generateMessageId(),
    category,
    severity,
    message,
    description: options?.description,
    code: options?.code,
    context: {
      timestamp: new Date(),
      ...options?.context
    },
    persistent: options?.persistent,
    timeout: options?.timeout,
    actions: options?.actions
  };
}

/**
 * Create a message batch for grouping related messages
 */
export function createMessageBatch(
  title: string,
  messages: GameMessage[],
  options?: {
    description?: string;
    context?: MessageContext;
    groupDismissable?: boolean;
  }
): MessageBatch {
  return {
    id: generateMessageId(),
    title,
    description: options?.description,
    messages,
    context: {
      timestamp: new Date(),
      ...options?.context
    },
    createdAt: new Date(),
    groupDismissable: options?.groupDismissable ?? true
  };
}

/**
 * Create a message queue entry
 */
export function createMessageQueueEntry(
  message: GameMessage,
  priority = 0
): MessageQueueEntry {
  return {
    id: generateMessageId(),
    message,
    priority,
    queuedAt: new Date(),
    displayed: false
  };
}

/**
 * Interpolate template variables in a string
 */
export function interpolateTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in variables) {
      return formatVariableValue(variables[key]);
    }
    return match; // Keep the placeholder if variable is not found
  });
}

/**
 * Format variable value for display
 */
export function formatVariableValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'number') {
    // Format large numbers with commas
    if (value >= 1000) {
      return value.toLocaleString();
    }
    return value.toString();
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

/**
 * Validate variable type against expected type
 */
export function isValidVariableType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
    default:
      return true;
  }
}

/**
 * Filter messages by severity
 */
export function filterMessagesBySeverity(
  messages: GameMessage[], 
  severities: MessageSeverity[]
): GameMessage[] {
  return messages.filter(message => severities.includes(message.severity));
}

/**
 * Filter messages by category
 */
export function filterMessagesByCategory(
  messages: GameMessage[], 
  categories: MessageCategory[]
): GameMessage[] {
  return messages.filter(message => categories.includes(message.category));
}

/**
 * Sort messages by priority (severity and timestamp)
 */
export function sortMessagesByPriority(messages: GameMessage[]): GameMessage[] {
  const severityPriority: Record<MessageSeverity, number> = {
    error: 4,
    warning: 3,
    success: 2,
    info: 1,
    debug: 0
  };
  
  return [...messages].sort((a, b) => {
    // First sort by severity priority
    const priorityDiff = severityPriority[b.severity] - severityPriority[a.severity];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Then sort by timestamp (newer first)
    const aTime = a.context?.timestamp?.getTime() ?? 0;
    const bTime = b.context?.timestamp?.getTime() ?? 0;
    return bTime - aTime;
  });
}

/**
 * Group messages by category
 */
export function groupMessagesByCategory(messages: GameMessage[]): Record<MessageCategory, GameMessage[]> {
  const groups: Partial<Record<MessageCategory, GameMessage[]>> = {};
  
  for (const message of messages) {
    if (!groups[message.category]) {
      groups[message.category] = [];
    }
    groups[message.category]!.push(message);
  }
  
  return groups as Record<MessageCategory, GameMessage[]>;
}

/**
 * Check if a message should auto-dismiss
 */
export function shouldAutoDismiss(message: GameMessage): boolean {
  return !message.persistent && typeof message.timeout === 'number' && message.timeout > 0;
}

/**
 * Get auto-dismiss timeout for a message
 */
export function getAutoDismissTimeout(message: GameMessage): number | null {
  return shouldAutoDismiss(message) ? message.timeout! : null;
}

/**
 * Create a system notification message
 */
export function createSystemMessage(
  severity: MessageSeverity,
  message: string,
  options?: {
    persistent?: boolean;
    timeout?: number;
    metadata?: Record<string, any>;
  }
): GameMessage {
  return createMessage('system', severity, message, {
    persistent: options?.persistent ?? (severity === 'error' || severity === 'warning'),
    timeout: options?.timeout ?? (severity === 'error' ? undefined : 5000),
    context: {
      timestamp: new Date(),
      metadata: options?.metadata
    }
  });
}

/**
 * Create a validation error message
 */
export function createValidationMessage(
  fieldName: string,
  error: string,
  context?: MessageContext
): GameMessage {
  return createMessage('validation', 'error', `${fieldName}: ${error}`, {
    persistent: true,
    code: 'VALIDATION_ERROR',
    context
  });
}

/**
 * Create multiple validation error messages
 */
export function createValidationMessages(
  fieldErrors: Record<string, string | string[]>,
  context?: MessageContext
): GameMessage[] {
  const messages: GameMessage[] = [];
  
  for (const [field, errors] of Object.entries(fieldErrors)) {
    const errorArray = Array.isArray(errors) ? errors : [errors];
    
    for (const error of errorArray) {
      messages.push(createValidationMessage(field, error, context));
    }
  }
  
  return messages;
}

/**
 * Deduplicate messages by code and content
 */
export function deduplicateMessages(messages: GameMessage[]): GameMessage[] {
  const seen = new Set<string>();
  const deduplicated: GameMessage[] = [];
  
  for (const message of messages) {
    const key = message.code ? 
      `${message.code}:${message.message}` : 
      `${message.category}:${message.severity}:${message.message}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(message);
    }
  }
  
  return deduplicated;
}

/**
 * Convert message to display format
 */
export function messageToDisplayFormat(message: GameMessage): {
  id: string;
  title: string;
  description?: string;
  severity: MessageSeverity;
  category: MessageCategory;
  timestamp: Date;
  persistent: boolean;
  timeout?: number;
  actions?: any[];
} {
  return {
    id: message.id,
    title: message.message,
    description: message.description,
    severity: message.severity,
    category: message.category,
    timestamp: message.context?.timestamp ?? new Date(),
    persistent: message.persistent ?? false,
    timeout: message.timeout,
    actions: message.actions
  };
}