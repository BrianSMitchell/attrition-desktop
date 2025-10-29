# Migration Guide: Game Messages & API Response Patterns

This guide provides step-by-step instructions for migrating your existing Attrition codebase to use the new standardized game messaging and API response systems.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [Server-Side Migration](#server-side-migration)
5. [Client-Side Migration](#client-side-migration)
6. [Socket.IO Migration](#socket-io-migration)
7. [Testing Integration](#testing-integration)
8. [Gradual Migration Strategy](#gradual-migration-strategy)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

## Overview

The new messaging and API response systems provide:

- **Consistent messaging** across all components
- **Type-safe API responses** with comprehensive error handling
- **Real-time message broadcasting** through Socket.IO
- **Template-based messaging** with dynamic variable substitution
- **Enhanced error handling** with detailed context
- **Validation schemas** for runtime type checking

## Prerequisites

1. **Build the shared package**:
   ```bash
   cd packages/shared
   npm run build
   ```

2. **Update imports** in your IDE to ensure proper type checking

3. **Review existing code** patterns to identify migration points

## Step-by-Step Migration

### Phase 1: Immediate Benefits (Low Risk)

Start with these changes that provide immediate benefits without breaking existing functionality:

#### 1.1 Add Enhanced Error Handling Middleware

**Server (`packages/server/src/index.ts`)**:

```typescript
import { enhancedErrorHandler } from '@game/shared';

// Replace existing error handler
app.use(enhancedErrorHandler);
```

#### 1.2 Update New API Endpoints

For any new API endpoints, use the new response patterns immediately:

```typescript
import { createSuccessResponse, sendApiResponse } from '@game/shared';

// New endpoints can use enhanced patterns immediately
app.get('/api/new-endpoint', async (req, res) => {
  const data = await someService.getData();
  const response = createSuccessResponse(data, {
    message: 'Data retrieved successfully'
  });
  sendApiResponse(res, response);
});
```

#### 1.3 Add Message Container to Client

**Client (`packages/client/src/App.tsx`)**:

```typescript
import { MessageContainer } from './components/ui/EnhancedMessageContainer';

function App() {
  return (
    <div className="app">
      {/* Your existing app content */}
      
      {/* Add message container for new notifications */}
      <MessageContainer />
    </div>
  );
}
```

### Phase 2: Gradual Component Migration

#### 2.1 Migrate Individual API Routes

Replace existing routes one at a time:

**Before**:
```typescript
// packages/server/src/routes/auth.ts
app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await authService.login(req.body);
    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    res.json({
      success: true,
      data: result.data,
      message: 'Login successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
```

**After**:
```typescript
import { 
  createSuccessResponse, 
  createErrorResponse, 
  sendApiResponse,
  ApiErrorCode,
  HttpStatusCode 
} from '@game/shared';

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await authService.login(req.body);
    if (!result.success) {
      const response = createErrorResponse(
        ApiErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        { statusCode: HttpStatusCode.UNAUTHORIZED }
      );
      return sendApiResponse(res, response);
    }
    
    const response = createSuccessResponse(result.data, {
      message: 'Login successful',
      statusCode: HttpStatusCode.OK
    });
    sendApiResponse(res, response);
    
  } catch (error) {
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(errorCode, message, { details });
    sendApiResponse(res, response);
  }
});
```

#### 2.2 Migrate React Components

Replace existing notification calls with new message system:

**Before**:
```typescript
// packages/client/src/components/BuildingPanel.tsx
const handleConstruct = async () => {
  try {
    const response = await api.constructBuilding(data);
    if (response.success) {
      showToast('Building construction started!', 'success');
    } else {
      showToast(response.error, 'error');
    }
  } catch (error) {
    showToast('Network error', 'error');
  }
};
```

**After**:
```typescript
import { 
  useNotifications,
  isSuccessResponse,
  isErrorResponse,
  BUILDING_MESSAGES 
} from '@game/shared';

const { showTemplateMessage, showSystemMessage } = useNotifications();

const handleConstruct = async () => {
  try {
    const response = await api.constructBuilding(data);
    
    if (isSuccessResponse(response)) {
      const { building, message } = response.data;
      
      // Use the message from the server if available
      if (message) {
        showMessage(message);
      } else {
        // Fallback to template
        showTemplateMessage(
          BUILDING_MESSAGES.CONSTRUCTION_STARTED,
          {
            buildingName: building.displayName,
            locationCoord: data.locationCoord,
            constructionTime: building.constructionTimeMinutes
          }
        );
      }
    } else if (isErrorResponse(response)) {
      showSystemMessage('error', response.error, { persistent: true });
    }
  } catch (error) {
    showSystemMessage('error', 'Network error occurred', { persistent: true });
  }
};
```

#### 2.3 Migrate Socket.IO Events

**Server Side**:

Replace existing Socket.IO broadcasting:

**Before**:
```typescript
// When building completes
socket.to(`empire:${empireId}`).emit('building:completed', {
  building,
  message: 'Building construction completed!'
});
```

**After**:
```typescript
import { processMessageTemplate, BUILDING_MESSAGES } from '@game/shared';

// When building completes
const message = processMessageTemplate(
  BUILDING_MESSAGES.CONSTRUCTION_COMPLETED,
  {
    buildingName: building.displayName,
    locationCoord: building.locationCoord
  },
  { empireId, buildingId: building.id }
);

io.broadcastToEmpire(empireId, 'game:message', message);
```

**Client Side**:

**Before**:
```typescript
socket.on('building:completed', (data) => {
  showToast(data.message, 'success');
});
```

**After**:
```typescript
import { useNotifications } from '@game/shared';

const { showMessage } = useNotifications();

socket.on('game:message', (message) => {
  if (message.category === 'building') {
    showMessage(message);
  }
});
```

### Phase 3: Complete System Integration

#### 3.1 Replace Response Format Constants

**Before**:
```typescript
import { RESPONSE_FORMAT } from '../constants/response-formats';

return res.json(RESPONSE_FORMAT.SUCCESS(data, 'Success message'));
```

**After**:
```typescript
import { createSuccessResponse, sendApiResponse } from '@game/shared';

const response = createSuccessResponse(data, { message: 'Success message' });
sendApiResponse(res, response);
```

#### 3.2 Update Error Handling

**Before**:
```typescript
import { ERROR_MESSAGES, ERROR_CODES } from '../constants/response-formats';

return res.status(400).json({
  success: false,
  error: ERROR_MESSAGES.INVALID_INPUT,
  code: ERROR_CODES.VALIDATION_FAILED
});
```

**After**:
```typescript
import { createErrorResponse, ApiErrorCode, HttpStatusCode } from '@game/shared';

const response = createErrorResponse(
  ApiErrorCode.VALIDATION_FAILED,
  'Invalid input provided',
  { statusCode: HttpStatusCode.BAD_REQUEST }
);
sendApiResponse(res, response);
```

#### 3.3 Implement Comprehensive Message System

Create a centralized notification service:

```typescript
// packages/client/src/services/NotificationService.ts
import { 
  GameMessage,
  processMessageTemplate,
  createSystemMessage 
} from '@game/shared';

class NotificationService {
  private notifications: GameMessage[] = [];
  private listeners: Array<(messages: GameMessage[]) => void> = [];

  subscribe(callback: (messages: GameMessage[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  addMessage(message: GameMessage) {
    this.notifications = [...this.notifications, message];
    this.notifyListeners();
    
    // Auto-dismiss logic
    if (!message.persistent && message.timeout) {
      setTimeout(() => {
        this.removeMessage(message.id);
      }, message.timeout);
    }
  }

  removeMessage(messageId: string) {
    this.notifications = this.notifications.filter(n => n.id !== messageId);
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.notifications));
  }
}

export const notificationService = new NotificationService();
```

## Server-Side Migration

### Migration Checklist for Server

- [ ] **Replace response builders**: Update all `RESPONSE_FORMAT.SUCCESS()` calls
- [ ] **Update error handling**: Replace error codes with new `ApiErrorCode` enum
- [ ] **Add request IDs**: Ensure all responses include unique request identifiers
- [ ] **Implement pagination**: Use `createListResponse()` for paginated endpoints
- [ ] **Add rate limiting info**: Include rate limit headers in responses
- [ ] **Update Socket.IO**: Replace custom message broadcasting with new system
- [ ] **Add message templates**: Replace hardcoded strings with templates

### Server Migration Script

Create a migration script to help with bulk updates:

```bash
# packages/server/scripts/migrate-responses.js
const fs = require('fs');
const path = require('path');

function migrateResponseFormats(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace RESPONSE_FORMAT.SUCCESS calls
  content = content.replace(
    /RESPONSE_FORMAT\.SUCCESS\((.*?)\)/g,
    'createSuccessResponse($1)'
  );
  
  // Replace RESPONSE_FORMAT.ERROR calls
  content = content.replace(
    /RESPONSE_FORMAT\.ERROR\((.*?)\)/g,
    'createErrorResponse(ApiErrorCode.OPERATION_FAILED, $1)'
  );
  
  fs.writeFileSync(filePath, content);
}

// Run migration on all route files
// ... implementation
```

## Client-Side Migration

### Migration Checklist for Client

- [ ] **Update API service**: Replace response handling logic
- [ ] **Add notification system**: Implement new message display components
- [ ] **Update error handling**: Use standardized error response structure
- [ ] **Add Socket.IO message handling**: Listen for new message format
- [ ] **Replace toast notifications**: Use new message system
- [ ] **Add type checking**: Validate API responses at runtime
- [ ] **Update loading states**: Use enhanced response metadata

### Client Migration Patterns

#### API Service Migration

**Before**:
```typescript
class ApiService {
  async request(url: string, options: RequestInit) {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data.data;
  }
}
```

**After**:
```typescript
import { 
  EnhancedApiResponse, 
  isSuccessResponse, 
  isErrorResponse 
} from '@game/shared';

class ApiService {
  async request<T>(url: string, options: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    const apiResponse: EnhancedApiResponse<T> = await response.json();
    
    if (isSuccessResponse(apiResponse)) {
      return apiResponse.data;
    } else if (isErrorResponse(apiResponse)) {
      // Let the notification system handle error display
      throw new ApiError(apiResponse.errorCode, apiResponse.error, apiResponse.details);
    } else {
      throw new Error('Invalid API response format');
    }
  }
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

## Socket.IO Migration

### Server-Side Socket Migration

**Before**:
```typescript
io.on('connection', (socket) => {
  socket.on('building:construct', async (data) => {
    try {
      const result = await buildingService.construct(data);
      socket.emit('building:constructed', {
        success: true,
        building: result
      });
    } catch (error) {
      socket.emit('building:error', {
        success: false,
        error: error.message
      });
    }
  });
});
```

**After**:
```typescript
import { setupEnhancedSocketIO } from '@game/shared/docs/integration-examples-socket';

setupEnhancedSocketIO(io);
```

### Client-Side Socket Migration

**Before**:
```typescript
socket.on('building:constructed', (data) => {
  if (data.success) {
    showToast('Building constructed!', 'success');
  }
});

socket.on('building:error', (data) => {
  showToast(data.error, 'error');
});
```

**After**:
```typescript
import { useNotifications, GameMessage } from '@game/shared';

const { showMessage } = useNotifications();

socket.on('game:message', (message: GameMessage) => {
  showMessage(message);
});
```

## Testing Integration

### Testing Checklist

- [ ] **API Response Format**: Verify all endpoints return standardized responses
- [ ] **Message Display**: Test message notifications in UI
- [ ] **Socket.IO Messages**: Verify real-time message broadcasting
- [ ] **Error Handling**: Test error scenarios and message display
- [ ] **Validation**: Test runtime validation with invalid data
- [ ] **Type Safety**: Ensure TypeScript compilation with no errors
- [ ] **Performance**: Verify no performance regression

### Integration Tests

Create integration tests to verify the new systems:

```typescript
// packages/shared/__tests__/integration.test.ts
import { 
  createSuccessResponse,
  processMessageTemplate,
  BUILDING_MESSAGES 
} from '../src';

describe('Integration Tests', () => {
  test('API response creation', () => {
    const response = createSuccessResponse(
      { id: 1, name: 'Test' },
      { message: 'Success' }
    );
    
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ id: 1, name: 'Test' });
    expect(response.message).toBe('Success');
    expect(response.requestId).toBeDefined();
    expect(response.timestamp).toBeDefined();
  });

  test('Message template processing', () => {
    const message = processMessageTemplate(
      BUILDING_MESSAGES.CONSTRUCTION_STARTED,
      {
        buildingName: 'Metal Mine',
        locationCoord: 'A00:10:20:05',
        constructionTime: 30
      }
    );
    
    expect(message.message).toContain('Metal Mine');
    expect(message.message).toContain('A00:10:20:05');
    expect(message.category).toBe('building');
    expect(message.severity).toBe('success');
  });
});
```

### Manual Testing Scenarios

1. **API Endpoints**:
   - Test successful responses include all required fields
   - Test error responses have proper error codes and messages
   - Test pagination responses include metadata

2. **Message System**:
   - Test message display with different severity levels
   - Test auto-dismiss functionality
   - Test persistent messages require manual dismissal
   - Test message actions work correctly

3. **Socket.IO**:
   - Test real-time message broadcasting
   - Test message reception on client
   - Test room-based message targeting

## Gradual Migration Strategy

### Week 1: Foundation
- [ ] Add new dependencies and build shared package
- [ ] Add enhanced error handler middleware
- [ ] Add message container component to client
- [ ] Migrate 1-2 simple API endpoints as proof of concept

### Week 2: Core Components
- [ ] Migrate authentication endpoints
- [ ] Migrate main game API routes (empire, buildings)
- [ ] Update Socket.IO event handling
- [ ] Replace existing toast system with new messages

### Week 3: Advanced Features
- [ ] Add template-based messaging throughout
- [ ] Implement real-time notifications
- [ ] Add comprehensive error handling
- [ ] Update validation and type checking

### Week 4: Testing & Polish
- [ ] Comprehensive testing of all integrated systems
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Remove deprecated code

## Common Patterns

### Pattern 1: API Endpoint Migration

```typescript
// Template for migrating API endpoints
import {
  createSuccessResponse,
  createErrorResponse,
  sendApiResponse,
  standardizeError,
  ApiErrorCode
} from '@game/shared';

export const migratedEndpoint = async (req: Request, res: Response) => {
  try {
    // Your business logic here
    const result = await someService.performOperation(req.body);
    
    // Success response
    const response = createSuccessResponse(result, {
      message: 'Operation completed successfully'
    });
    sendApiResponse(res, response);
    
  } catch (error) {
    // Standardized error handling
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(errorCode, message, { details });
    sendApiResponse(res, response);
  }
};
```

### Pattern 2: React Component Notification

```typescript
// Template for component notifications
import { useNotifications, TEMPLATE_MESSAGES } from '@game/shared';

const MyComponent = () => {
  const { showTemplateMessage, showSystemMessage } = useNotifications();

  const handleAction = async () => {
    try {
      const response = await api.performAction();
      
      if (isSuccessResponse(response)) {
        // Use appropriate message template
        showTemplateMessage(
          TEMPLATE_MESSAGES.ACTION_SUCCESS,
          { /* template variables */ },
          { /* context */ }
        );
      }
    } catch (error) {
      showSystemMessage('error', 'Action failed', { persistent: true });
    }
  };

  return (
    // Component JSX
  );
};
```

### Pattern 3: Socket.IO Event Handling

```typescript
// Template for Socket.IO events
socket.on('game:message', (message: GameMessage) => {
  // Filter messages by category if needed
  if (message.category === 'building') {
    showMessage(message);
  }
});
```

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure `@game/shared` is built and properly imported
2. **Message Not Displaying**: Check message container is added to your app
3. **Socket.IO Not Working**: Verify enhanced setup is used on both client and server
4. **API Response Format**: Ensure all endpoints use new response utilities
5. **Validation Errors**: Check that data matches expected schemas

### Debugging Tips

1. **Enable Debug Logging**:
   ```typescript
   import { validateGameMessage } from '@game/shared';
   
   const result = validateGameMessage(messageData);
   if (!result.success) {
     console.log('Validation errors:', result.error.errors);
   }
   ```

2. **Check Network Tab**: Verify API responses have new format

3. **Inspect Socket Events**: Use browser dev tools to monitor Socket.IO messages

### Performance Considerations

- Message templates are processed on each use - consider caching for high-frequency messages
- Large message queues may impact performance - implement cleanup strategies
- Socket.IO rooms should be managed properly to avoid memory leaks

## Migration Completion

Once migration is complete, you can:

1. **Remove deprecated code**:
   - Delete old response format constants
   - Remove old toast notification system
   - Clean up unused Socket.IO event handlers

2. **Update documentation**:
   - API documentation with new response format
   - Component usage examples
   - Socket.IO event reference

3. **Celebrate** 🎉 - You now have a consistent, type-safe messaging system across your entire application!

## Getting Help

If you encounter issues during migration:

1. Check the integration examples in `docs/integration-examples-*.ts`
2. Review the comprehensive documentation in `docs/messaging-and-api-patterns.md`
3. Use the validation functions to debug data format issues
4. Test individual components in isolation to identify problems

The new system provides significant benefits in consistency, maintainability, and developer experience - the migration effort will pay dividends in the long run!