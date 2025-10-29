// Zod validation schemas for message and API response structures

import { z } from 'zod';

// Message System Schemas
export const MessageSeveritySchema = z.enum(['success', 'error', 'warning', 'info', 'debug']);

export const MessageCategorySchema = z.enum([
  'auth', 'empire', 'building', 'research', 'fleet', 'combat', 
  'trade', 'diplomacy', 'exploration', 'system', 'validation', 'network'
]);

export const MessageContextSchema = z.object({
  timestamp: z.date().optional(),
  userId: z.string().optional(),
  empireId: z.string().optional(),
  locationCoord: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const MessageActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['primary', 'secondary', 'danger']),
  handler: z.string(),
  params: z.record(z.any()).optional()
});

export const GameMessageSchema = z.object({
  id: z.string(),
  category: MessageCategorySchema,
  severity: MessageSeveritySchema,
  message: z.string(),
  description: z.string().optional(),
  code: z.string().optional(),
  context: MessageContextSchema.optional(),
  persistent: z.boolean().optional(),
  timeout: z.number().positive().optional(),
  actions: z.array(MessageActionSchema).optional()
});

export const MessageTemplateVariableSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'date']),
  required: z.boolean(),
  description: z.string()
});

export const MessageTemplateSchema = z.object({
  id: z.string(),
  category: MessageCategorySchema,
  severity: MessageSeveritySchema,
  template: z.string(),
  descriptionTemplate: z.string().optional(),
  defaultTimeout: z.number().positive().optional(),
  persistent: z.boolean().optional(),
  variables: z.record(MessageTemplateVariableSchema).optional()
});

export const MessageBatchSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  messages: z.array(GameMessageSchema),
  context: MessageContextSchema.optional(),
  createdAt: z.date(),
  groupDismissable: z.boolean().optional()
});

export const MessageQueueEntrySchema = z.object({
  id: z.string(),
  message: GameMessageSchema,
  priority: z.number(),
  queuedAt: z.date(),
  displayed: z.boolean(),
  displayedAt: z.date().optional(),
  dismissedAt: z.date().optional()
});

// API Response System Schemas
export const HttpStatusCodeSchema = z.number().int().min(100).max(599);

export const ApiErrorCodeSchema = z.enum([
  'INVALID_CREDENTIALS', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'ACCESS_DENIED',
  'ACCOUNT_LOCKED', 'EMAIL_NOT_VERIFIED', 'VALIDATION_FAILED', 
  'MISSING_REQUIRED_FIELD', 'INVALID_FORMAT', 'VALUE_OUT_OF_RANGE',
  'DUPLICATE_VALUE', 'INSUFFICIENT_RESOURCES', 'EMPIRE_NOT_FOUND',
  'LOCATION_OCCUPIED', 'LOCATION_INVALID', 'BUILDING_LIMIT_REACHED',
  'TECH_REQUIREMENTS_NOT_MET', 'FLEET_IN_TRANSIT', 'COMBAT_IN_PROGRESS',
  'COOLDOWN_ACTIVE', 'DATABASE_ERROR', 'NETWORK_ERROR', 
  'SERVICE_UNAVAILABLE', 'RATE_LIMIT_EXCEEDED', 'MAINTENANCE_MODE',
  'UNKNOWN_ERROR', 'OPERATION_FAILED', 'RESOURCE_NOT_FOUND', 'INVALID_REQUEST'
]);

export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
  context: z.record(z.any()).optional()
});

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean()
});

export const RateLimitInfoSchema = z.object({
  limit: z.number().int().positive(),
  remaining: z.number().int().nonnegative(),
  resetTime: z.number().int(),
  windowSize: z.number().int().positive()
});

export const EnhancedApiResponseSchema = z.object({
  success: z.boolean(),
  statusCode: HttpStatusCodeSchema,
  timestamp: z.string(),
  requestId: z.string(),
  meta: PaginationMetaSchema.optional(),
  rateLimit: RateLimitInfoSchema.optional(),
  metadata: z.record(z.any()).optional()
});

export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  EnhancedApiResponseSchema.extend({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional()
  });

export const ErrorResponseSchema = EnhancedApiResponseSchema.extend({
  success: z.literal(false),
  errorCode: ApiErrorCodeSchema,
  error: z.string(),
  details: z.array(ApiErrorDetailSchema).optional()
});

export const ListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  SuccessResponseSchema(z.array(itemSchema)).extend({
    meta: PaginationMetaSchema
  });

export const BulkOperationResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.boolean(),
    successCount: z.number().int().nonnegative(),
    errorCount: z.number().int().nonnegative(),
    successful: z.array(itemSchema),
    failed: z.array(z.object({
      item: z.any(),
      error: ApiErrorDetailSchema
    })),
    message: z.string(),
    requestId: z.string(),
    timestamp: z.string()
  });

export const AsyncOperationResponseSchema = z.object({
  operationId: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(100).optional(),
  message: z.string(),
  estimatedCompletionTime: z.string().optional(),
  pollIntervalSeconds: z.number().positive().optional(),
  result: z.any().optional(),
  error: ApiErrorDetailSchema.optional()
});

export const HealthCheckResponseSchema = z.object({
  service: z.string(),
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  timestamp: z.string(),
  uptime: z.number().nonnegative(),
  dependencies: z.record(z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    responseTime: z.number().nonnegative().optional(),
    message: z.string().optional()
  })),
  metrics: z.object({
    memoryUsage: z.number().nonnegative(),
    cpuUsage: z.number().nonnegative(),
    activeConnections: z.number().nonnegative()
  }).optional()
});

// Validation Functions
export function validateGameMessage(data: unknown) {
  return GameMessageSchema.safeParse(data);
}

export function validateMessageTemplate(data: unknown) {
  return MessageTemplateSchema.safeParse(data);
}

export function validateSuccessResponse<T>(data: unknown, dataSchema: z.ZodSchema<T>) {
  return SuccessResponseSchema(dataSchema).safeParse(data);
}

export function validateErrorResponse(data: unknown) {
  return ErrorResponseSchema.safeParse(data);
}

export function validateListResponse<T>(data: unknown, itemSchema: z.ZodSchema<T>) {
  return ListResponseSchema(itemSchema).safeParse(data);
}

export function validateBulkOperationResponse<T>(data: unknown, itemSchema: z.ZodSchema<T>) {
  return BulkOperationResponseSchema(itemSchema).safeParse(data);
}

export function validateAsyncOperationResponse(data: unknown) {
  return AsyncOperationResponseSchema.safeParse(data);
}

export function validateHealthCheckResponse(data: unknown) {
  return HealthCheckResponseSchema.safeParse(data);
}

// Template variable validation
export function validateTemplateVariables(
  template: z.infer<typeof MessageTemplateSchema>,
  variables: Record<string, any>
): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!template.variables) {
    return { success: true, errors: [] };
  }
  
  for (const [key, schema] of Object.entries(template.variables)) {
    // Check required variables
    if (schema.required && !(key in variables)) {
      errors.push(`Required variable '${key}' is missing`);
      continue;
    }
    
    // Type validation
    if (key in variables) {
      const value = variables[key];
      let isValid = false;
      
      switch (schema.type) {
        case 'string':
          isValid = typeof value === 'string';
          break;
        case 'number':
          isValid = typeof value === 'number' && !isNaN(value);
          break;
        case 'boolean':
          isValid = typeof value === 'boolean';
          break;
        case 'date':
          isValid = value instanceof Date || 
                    (typeof value === 'string' && !isNaN(Date.parse(value)));
          break;
      }
      
      if (!isValid) {
        errors.push(`Variable '${key}' has invalid type. Expected ${schema.type}, got ${typeof value}`);
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

// Utility function to convert Zod errors to API error details
export function zodErrorToApiErrorDetails(error: z.ZodError): z.infer<typeof ApiErrorDetailSchema>[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    context: {
      received: (err as any).received,
      expected: (err as any).expected
    }
  }));
}

// Runtime type assertion functions
export function assertGameMessage(data: unknown): asserts data is z.infer<typeof GameMessageSchema> {
  const result = GameMessageSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid GameMessage: ${result.error.message}`);
  }
}

export function assertEnhancedApiResponse(data: unknown): asserts data is z.infer<typeof EnhancedApiResponseSchema> {
  const result = EnhancedApiResponseSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid Enhanced API Response: ${result.error.message}`);
  }
}

// Export type inference helpers
export type GameMessageType = z.infer<typeof GameMessageSchema>;
export type MessageTemplateType = z.infer<typeof MessageTemplateSchema>;
export type ApiErrorDetailType = z.infer<typeof ApiErrorDetailSchema>;
export type PaginationMetaType = z.infer<typeof PaginationMetaSchema>;
export type SuccessResponseType<T> = z.infer<ReturnType<typeof SuccessResponseSchema<z.ZodType<T>>>>;
export type ErrorResponseType = z.infer<typeof ErrorResponseSchema>;
export type ListResponseType<T> = z.infer<ReturnType<typeof ListResponseSchema<z.ZodType<T>>>>;
export type BulkOperationResponseType<T> = z.infer<ReturnType<typeof BulkOperationResponseSchema<z.ZodType<T>>>>;
export type AsyncOperationResponseType = z.infer<typeof AsyncOperationResponseSchema>;
export type HealthCheckResponseType = z.infer<typeof HealthCheckResponseSchema>;