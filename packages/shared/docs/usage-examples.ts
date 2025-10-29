// Usage examples for the new message and API response systems
// NOTE: This file is for documentation purposes and is not part of the build

import {
  // Message system
  processMessageTemplate,
  createMessage,
  createSystemMessage,
  AUTH_MESSAGES,
  EMPIRE_MESSAGES,
  BUILDING_MESSAGES,
  
  // API response system
  createSuccessResponse,
  createErrorResponse,
  createListResponse,
  ApiErrorCode,
  HttpStatusCode,
  
  // Validation
  validateGameMessage,
  validateSuccessResponse,
  GameMessageSchema
} from '@game/shared';

// ===== MESSAGE SYSTEM EXAMPLES =====

// Example 1: Using predefined message templates
function showLoginSuccess(username: string) {
  const message = processMessageTemplate(
    AUTH_MESSAGES.LOGIN_SUCCESS,
    { username },
    { 
      userId: 'user_123',
      timestamp: new Date()
    }
  );
  
  // Result: GameMessage with processed template
  console.log(message);
  // {
  //   id: 'msg_1234567890_abc123',
  //   category: 'auth',
  //   severity: 'success',
  //   message: 'Welcome back, PlayerOne! Login successful.',
  //   code: 'auth.login.success',
  //   context: { userId: 'user_123', timestamp: Date },
  //   timeout: 3000
  // }
}

// Example 2: Creating custom messages
function showMaintenanceNotice() {
  const message = createSystemMessage(
    'warning',
    'Server will undergo maintenance in 30 minutes',
    {
      persistent: true,
      metadata: { maintenanceId: 'maint_001' }
    }
  );
  
  return message;
}

// Example 3: Creating building completion message
function showBuildingCompleted(buildingName: string, location: string) {
  const message = processMessageTemplate(
    BUILDING_MESSAGES.CONSTRUCTION_COMPLETED,
    {
      buildingName,
      locationCoord: location
    },
    {
      empireId: 'empire_456',
      locationCoord: location
    }
  );
  
  return message;
}

// Example 4: Creating validation messages
function showValidationErrors(fieldErrors: Record<string, string>) {
  const messages = Object.entries(fieldErrors).map(([field, error]) =>
    createMessage('validation', 'error', `${field}: ${error}`, {
      persistent: true,
      context: { metadata: { field } }
    })
  );
  
  return messages;
}

// ===== API RESPONSE EXAMPLES =====

// Example 1: Success response for empire creation
function createEmpireSuccessResponse(empire: any) {
  return createSuccessResponse(
    empire,
    {
      message: 'Empire created successfully',
      statusCode: HttpStatusCode.CREATED,
      metadata: { 
        feature: 'empire_creation',
        version: '1.0'
      }
    }
  );
}

// Example 2: Error response for insufficient resources
function createInsufficientResourcesError(required: number, available: number) {
  return createErrorResponse(
    ApiErrorCode.INSUFFICIENT_RESOURCES,
    'Not enough credits to complete this action',
    {
      statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
      details: [
        {
          field: 'credits',
          message: `Required: ${required}, Available: ${available}`,
          code: 'INSUFFICIENT_CREDITS',
          context: { required, available }
        }
      ]
    }
  );
}

// Example 3: Paginated list response
function createBuildingsListResponse(buildings: any[], page: number, total: number) {
  const limit = 20;
  const totalPages = Math.ceil(total / limit);
  
  return createListResponse(
    buildings,
    {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    },
    {
      message: `Retrieved ${buildings.length} buildings`,
      metadata: { cacheKey: `buildings_${page}` }
    }
  );
}

// ===== VALIDATION EXAMPLES =====

// Example 1: Validating a game message
function validateMessage(messageData: unknown) {
  const result = validateGameMessage(messageData);
  
  if (result.success) {
    console.log('Valid message:', result.data);
    return result.data;
  } else {
    console.error('Invalid message:', result.error.issues);
    throw new Error('Message validation failed');
  }
}

// Example 2: Validating API response
function validateApiResponse(responseData: unknown) {
  // For a specific data type (e.g., Empire)
  const EmpireSchema = GameMessageSchema; // Placeholder - use actual Empire schema
  
  const result = validateSuccessResponse(responseData, EmpireSchema);
  
  if (result.success) {
    console.log('Valid API response:', result.data);
    return result.data;
  } else {
    console.error('Invalid API response:', result.error.issues);
    throw new Error('API response validation failed');
  }
}

// ===== INTEGRATION EXAMPLES =====

// Example 1: Express.js endpoint with full error handling
/*
import express from 'express';
import { sendApiResponse, standardizeError } from '@game/shared';

const app = express();

app.post('/api/empire', async (req, res) => {
  try {
    // Validate request
    const empireData = validateEmpireCreationRequest(req.body);
    
    // Create empire
    const empire = await createEmpire(empireData);
    
    // Send success response
    const response = createSuccessResponse(empire, {
      message: 'Empire created successfully',
      statusCode: HttpStatusCode.CREATED
    });
    
    sendApiResponse(res, response);
    
  } catch (error) {
    // Standardize and send error response
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(errorCode, message, { details });
    
    sendApiResponse(res, response);
  }
});
*/

// Example 2: React component using messages
/*
import { useNotifications } from '../hooks/useNotifications';

function EmpireManagement() {
  const { showMessage } = useNotifications();
  
  const handleEmpireCreated = async (empireName: string) => {
    try {
      const response = await createEmpire({ name: empireName });
      
      // Show success message
      const message = processMessageTemplate(
        EMPIRE_MESSAGES.EMPIRE_CREATED,
        { empireName }
      );
      showMessage(message);
      
    } catch (error) {
      // Show error message
      const errorMessage = createSystemMessage(
        'error',
        'Failed to create empire. Please try again.',
        { persistent: true }
      );
      showMessage(errorMessage);
    }
  };
  
  return (
    <div>
      // Component JSX
    </div>
  );
}
*/

// Example 3: Socket.IO event handling
/*
import { Server } from 'socket.io';
import { createMessage } from '@game/shared';

const io = new Server();

io.on('connection', (socket) => {
  socket.on('empire-under-attack', (data) => {
    const message = createMessage(
      'combat',
      'warning',
      `Your territory at ${data.location} is under attack by ${data.attackerName}!`,
      {
        persistent: true,
        context: {
          empireId: data.defenderId,
          locationCoord: data.location,
          metadata: { 
            attackerId: data.attackerId,
            attackType: data.attackType
          }
        }
      }
    );
    
    // Send to specific empire
    socket.to(`empire_${data.defenderId}`).emit('game-message', message);
  });
});
*/

// ===== ADVANCED USAGE PATTERNS =====

// Example 1: Message batching for multiple related events
function createResourceUpdateBatch(updates: any[]) {
  const messages = updates.map(update =>
    processMessageTemplate(
      EMPIRE_MESSAGES.RESOURCES_UPDATED,
      {
        creditsGained: update.creditsGained,
        totalCredits: update.totalCredits
      }
    )
  );
  
  return {
    id: 'batch_' + Date.now(),
    title: 'Resource Updates',
    messages,
    createdAt: new Date(),
    groupDismissable: true
  };
}

// Example 2: Progressive error handling
function handleProgressiveError(error: unknown) {
  const { errorCode, message, details } = standardizeError(error);
  
  // Create user-friendly message
  const userMessage = createSystemMessage(
    'error',
    getUserFriendlyMessage(errorCode, message),
    { persistent: true }
  );
  
  // Create detailed API response for logging
  const apiResponse = createErrorResponse(errorCode, message, {
    details,
    metadata: {
      timestamp: Date.now(),
      userAgent: 'game-client',
      stackTrace: error instanceof Error ? error.stack : undefined
    }
  });
  
  return { userMessage, apiResponse };
}

function getUserFriendlyMessage(errorCode: ApiErrorCode, originalMessage: string): string {
  switch (errorCode) {
    case ApiErrorCode.INSUFFICIENT_RESOURCES:
      return 'You don\'t have enough resources for this action. Gather more resources and try again.';
    case ApiErrorCode.TECH_REQUIREMENTS_NOT_MET:
      return 'This action requires advanced technology. Research the necessary technologies first.';
    case ApiErrorCode.LOCATION_OCCUPIED:
      return 'This location is already occupied. Choose a different location.';
    default:
      return originalMessage;
  }
}

// Export examples for documentation
export {
  showLoginSuccess,
  showMaintenanceNotice,
  showBuildingCompleted,
  createEmpireSuccessResponse,
  createInsufficientResourcesError,
  createBuildingsListResponse,
  validateMessage,
  validateApiResponse,
  createResourceUpdateBatch,
  handleProgressiveError
};