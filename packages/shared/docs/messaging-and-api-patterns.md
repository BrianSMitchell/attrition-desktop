# Game Messages & API Response Patterns

This document describes the standardized game messaging system and API response patterns implemented in the Attrition project.

## Overview

The messaging and API response systems provide consistent, type-safe ways to handle user-facing notifications and API communications across the entire application. This ensures a uniform user experience and predictable developer interface.

## Table of Contents

1. [Game Messages System](#game-messages-system)
2. [API Response Patterns](#api-response-patterns)
3. [Message Templates](#message-templates)
4. [Error Handling](#error-handling)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)
7. [Validation](#validation)

## Game Messages System

### Message Structure

Every game message follows a standardized structure defined by the `GameMessage` interface:

```typescript
interface GameMessage {
  id: string;                    // Unique identifier
  category: MessageCategory;     // Feature category
  severity: MessageSeverity;     // Priority level
  message: string;               // Main text
  description?: string;          // Optional details
  code?: string;                 // Programmatic code
  context?: MessageContext;      // Additional context
  persistent?: boolean;          // Should stay visible
  timeout?: number;              // Auto-dismiss time (ms)
  actions?: MessageAction[];     // User actions
}
```

### Message Categories

Messages are organized into logical categories:

- **`auth`** - Authentication and login
- **`empire`** - Empire management
- **`building`** - Building construction
- **`research`** - Technology research
- **`fleet`** - Fleet and ship management
- **`combat`** - Combat and warfare
- **`trade`** - Trading and economy
- **`diplomacy`** - Diplomatic actions
- **`exploration`** - Exploration and colonization
- **`system`** - System-level messages
- **`validation`** - Input validation
- **`network`** - Network connectivity

### Message Severity

Messages have five severity levels:

1. **`error`** - Critical issues (persistent by default)
2. **`warning`** - Important notices (persistent by default)
3. **`success`** - Positive outcomes (auto-dismiss)
4. **`info`** - General information (auto-dismiss)
5. **`debug`** - Development information (auto-dismiss)

### Creating Messages

#### Using Templates

```typescript
import { processMessageTemplate, AUTH_MESSAGES } from '@game/shared';

// Create a login success message
const message = processMessageTemplate(
  AUTH_MESSAGES.LOGIN_SUCCESS,
  { username: 'PlayerOne' },
  { userId: '12345', empireId: 'emp_001' }
);
```

#### Direct Creation

```typescript
import { createMessage } from '@game/shared';

const message = createMessage(
  'system',
  'info',
  'Server maintenance completed',
  {
    timeout: 5000,
    context: { timestamp: new Date() }
  }
);
```

## API Response Patterns

### Standard Response Structure

All API responses follow a consistent structure:

```typescript
interface ApiResponse<T = any> {
  success: boolean;              // Operation success status
  statusCode: HttpStatusCode;    // HTTP status code
  data?: T;                      // Response data (success only)
  message?: string;              // Success message
  errorCode?: ApiErrorCode;      // Error code (failure only)
  error?: string;                // Error message (failure only)
  details?: ApiErrorDetail[];    // Detailed error information
  timestamp: string;             // Response timestamp
  requestId: string;             // Unique request identifier
  meta?: PaginationMeta;         // Pagination info (lists)
  rateLimit?: RateLimitInfo;     // Rate limiting info
  metadata?: Record<string, any>; // Additional metadata
}
```

### Response Types

#### Success Response

```typescript
{
  "success": true,
  "statusCode": 200,
  "data": { "empireId": "emp_001", "name": "Star Empire" },
  "message": "Empire created successfully",
  "timestamp": "2023-12-01T10:30:00Z",
  "requestId": "req_1701422200_abc123"
}
```

#### Error Response

```typescript
{
  "success": false,
  "statusCode": 422,
  "errorCode": "INSUFFICIENT_RESOURCES",
  "error": "Not enough credits to build structure",
  "details": [
    {
      "field": "credits",
      "message": "Required: 1000, Available: 500",
      "code": "INSUFFICIENT_CREDITS"
    }
  ],
  "timestamp": "2023-12-01T10:30:00Z",
  "requestId": "req_1701422200_xyz789"
}
```

#### List Response

```typescript
{
  "success": true,
  "statusCode": 200,
  "data": [
    { "id": "bld_001", "type": "metal_mine", "level": 3 },
    { "id": "bld_002", "type": "energy_plant", "level": 2 }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  },
  "timestamp": "2023-12-01T10:30:00Z",
  "requestId": "req_1701422200_def456"
}
```

### Creating API Responses

#### Success Response

```typescript
import { createSuccessResponse, HttpStatusCode } from '@game/shared';

const response = createSuccessResponse(
  { empireId: 'emp_001', name: 'Star Empire' },
  {
    message: 'Empire created successfully',
    statusCode: HttpStatusCode.CREATED
  }
);
```

#### Error Response

```typescript
import { createErrorResponse, ApiErrorCode } from '@game/shared';

const response = createErrorResponse(
  ApiErrorCode.INSUFFICIENT_RESOURCES,
  'Not enough credits to build structure',
  {
    statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
    details: [
      {
        field: 'credits',
        message: 'Required: 1000, Available: 500',
        code: 'INSUFFICIENT_CREDITS'
      }
    ]
  }
);
```

## Message Templates

Message templates provide a consistent way to generate dynamic messages with variable substitution.

### Template Definition

```typescript
const EMPIRE_CREATED: MessageTemplate = {
  id: 'empire.create.success',
  category: 'empire',
  severity: 'success',
  template: 'Empire "{empireName}" has been established! Your journey begins.',
  defaultTimeout: 5000,
  variables: {
    empireName: { 
      type: 'string', 
      required: true, 
      description: 'Name of the new empire' 
    }
  }
};
```

### Template Processing

Templates support variable substitution using `{variableName}` syntax:

```typescript
import { processMessageTemplate } from '@game/shared';

const message = processMessageTemplate(
  EMPIRE_CREATED,
  { empireName: 'Galactic Federation' }
);
// Result: "Empire 'Galactic Federation' has been established! Your journey begins."
```

### Built-in Templates

The system includes pre-defined templates for common scenarios:

- **Authentication**: Login, logout, registration, errors
- **Empire**: Creation, resource updates, errors
- **Buildings**: Construction, completion, errors
- **Research**: Projects, completion, errors
- **Fleets**: Creation, movement, combat
- **System**: Maintenance, connectivity, validation

## Error Handling

### Standard Error Codes

The system defines standard error codes for consistent error handling:

```typescript
enum ApiErrorCode {
  // Authentication & Authorization
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  
  // Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Game Logic
  INSUFFICIENT_RESOURCES = 'INSUFFICIENT_RESOURCES',
  LOCATION_OCCUPIED = 'LOCATION_OCCUPIED',
  TECH_REQUIREMENTS_NOT_MET = 'TECH_REQUIREMENTS_NOT_MET',
  
  // System
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}
```

### Error Response Utilities

```typescript
import { standardizeError, createErrorResponse } from '@game/shared';

try {
  // Some operation that might fail
  await performOperation();
} catch (error) {
  const { errorCode, message, details } = standardizeError(error);
  return createErrorResponse(errorCode, message, { details });
}
```

## Usage Examples

### Express.js Endpoint

```typescript
import { createSuccessResponse, createErrorResponse, sendApiResponse } from '@game/shared';

app.post('/api/empire', async (req, res) => {
  try {
    const empire = await createEmpire(req.body);
    const response = createSuccessResponse(empire, {
      message: 'Empire created successfully',
      statusCode: HttpStatusCode.CREATED
    });
    sendApiResponse(res, response);
  } catch (error) {
    const { errorCode, message } = standardizeError(error);
    const response = createErrorResponse(errorCode, message);
    sendApiResponse(res, response);
  }
});
```

### React Component

```typescript
import { processMessageTemplate, BUILDING_MESSAGES } from '@game/shared';
import { useNotifications } from '../hooks/useNotifications';

function BuildingPanel() {
  const { showMessage } = useNotifications();
  
  const handleBuildingComplete = (building: Building) => {
    const message = processMessageTemplate(
      BUILDING_MESSAGES.CONSTRUCTION_COMPLETED,
      {
        buildingName: building.name,
        locationCoord: building.locationCoord
      }
    );
    showMessage(message);
  };
  
  // Component JSX...
}
```

### Socket.IO Events

```typescript
import { createMessage } from '@game/shared';

// Server-side
socket.on('empire-attacked', (data) => {
  const message = createMessage(
    'combat',
    'warning',
    `Your territory at ${data.location} is under attack!`,
    {
      persistent: true,
      context: {
        empireId: data.defenderId,
        locationCoord: data.location,
        metadata: { attackerId: data.attackerId }
      }
    }
  );
  
  socket.to(data.defenderId).emit('game-message', message);
});
```

## Best Practices

### Message Guidelines

1. **Be Specific**: Messages should clearly describe what happened
2. **Use Templates**: Leverage message templates for consistency
3. **Include Context**: Add relevant context information
4. **Set Appropriate Timeouts**: Error messages should persist, info messages can auto-dismiss
5. **Provide Actions**: Include actions when users can respond

### API Response Guidelines

1. **Always Include Timestamps**: Every response needs a timestamp
2. **Use Request IDs**: Include unique request identifiers for debugging
3. **Provide Detailed Errors**: Include field-specific error details
4. **Follow HTTP Status Codes**: Use appropriate HTTP status codes
5. **Include Rate Limit Info**: Add rate limiting information when applicable

### Error Handling

1. **Standardize Errors**: Use the `standardizeError` function for consistency
2. **Log for Debugging**: Always log errors with request context
3. **Don't Expose Internals**: Sanitize error messages for users
4. **Provide Recovery Actions**: Include guidance on how to resolve issues

## Validation

### Zod Schemas

The system includes comprehensive Zod schemas for runtime validation:

```typescript
import { validateGameMessage, validateSuccessResponse } from '@game/shared';

// Validate a game message
const result = validateGameMessage(messageData);
if (!result.success) {
  console.error('Invalid message:', result.error);
}

// Validate API response
const apiResult = validateSuccessResponse(responseData, EmpireSchema);
if (!apiResult.success) {
  console.error('Invalid API response:', apiResult.error);
}
```

### Template Variable Validation

```typescript
import { validateTemplateVariables } from '@game/shared';

const validation = validateTemplateVariables(template, variables);
if (!validation.success) {
  console.error('Template validation failed:', validation.errors);
}
```

### Type Safety

The system provides full TypeScript support:

```typescript
import type { GameMessage, ApiResponse, MessageTemplate } from '@game/shared';

// Type-safe message handling
function handleMessage(message: GameMessage) {
  // TypeScript knows the structure
  console.log(message.category, message.severity, message.message);
}

// Type-safe API responses
function handleApiResponse<T>(response: ApiResponse<T>) {
  if (response.success) {
    // TypeScript knows data is available
    processData(response.data);
  } else {
    // TypeScript knows error info is available
    handleError(response.errorCode, response.error);
  }
}
```

## Integration Points

### Frontend Integration

- **Notification Systems**: Display messages using the severity levels
- **Error Boundaries**: Handle API errors consistently
- **Loading States**: Use async operation responses for progress tracking

### Backend Integration

- **Express Middleware**: Use response utilities in route handlers
- **Socket.IO Events**: Send standardized messages via WebSocket
- **Background Jobs**: Report progress using async operation responses

### Database Integration

- **Error Mapping**: Convert database errors to standard API errors
- **Audit Logging**: Store message and response metadata for debugging
- **Rate Limiting**: Track API usage using request IDs

This comprehensive system ensures consistent user experience and developer productivity across the entire Attrition application.