// Server-side integration examples for migrating to the new API response patterns
// These examples show how to integrate the new @game/shared message and API systems
// into existing Express.js routes and services

import { Request, Response, NextFunction } from 'express';
import {
  // API Response utilities
  createSuccessResponse,
  createErrorResponse,
  createListResponse,
  sendApiResponse,
  standardizeError,
  withErrorHandling,
  ApiErrorCode,
  HttpStatusCode,
  
  // Message system
  processMessageTemplate,
  createSystemMessage,
  EMPIRE_MESSAGES,
  BUILDING_MESSAGES,
  AUTH_MESSAGES
} from '@game/shared';

// =============================================================================
// 1. MIGRATING EXISTING API ROUTES
// =============================================================================

// BEFORE: Using existing response-formats.ts
/*
import { RESPONSE_FORMAT } from '../constants/response-formats';

export const getEmpire = async (req: Request, res: Response) => {
  try {
    const empire = await findEmpireById(req.params.id);
    if (!empire) {
      return res.status(404).json(RESPONSE_FORMAT.NOT_FOUND('Empire'));
    }
    res.json(RESPONSE_FORMAT.SUCCESS(empire, 'Empire retrieved successfully'));
  } catch (error) {
    console.error('Error fetching empire:', error);
    res.status(500).json(RESPONSE_FORMAT.INTERNAL_ERROR());
  }
};
*/

// AFTER: Using new enhanced API response system
export const getEmpire = withErrorHandling(async (req: Request, res: Response) => {
  const empire = await findEmpireById(req.params.id);
  
  if (!empire) {
    const response = createErrorResponse(
      ApiErrorCode.EMPIRE_NOT_FOUND,
      'Empire not found',
      { statusCode: HttpStatusCode.NOT_FOUND }
    );
    return sendApiResponse(res, response);
  }

  const response = createSuccessResponse(
    empire,
    {
      message: 'Empire retrieved successfully',
      metadata: {
        empireId: empire.id,
        lastUpdated: empire.updatedAt
      }
    }
  );
  
  sendApiResponse(res, response);
});

// =============================================================================
// 2. BUILDING CONSTRUCTION ENDPOINTS WITH MESSAGES
// =============================================================================

// Enhanced building construction with integrated message system
export const startConstruction = async (req: Request, res: Response) => {
  try {
    const { locationCoord, buildingType } = req.body;
    const empireId = req.user.gameProfile.empireId;

    // Validate requirements (credits, tech, etc.)
    const validation = await validateConstructionRequirements(empireId, buildingType, locationCoord);
    if (!validation.success) {
      const response = createErrorResponse(
        validation.errorCode || ApiErrorCode.VALIDATION_FAILED,
        validation.message,
        {
          statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
          details: validation.details
        }
      );
      return sendApiResponse(res, response);
    }

    // Start construction
    const building = await startBuildingConstruction(empireId, locationCoord, buildingType);
    
    // Create success message using template
    const gameMessage = processMessageTemplate(
      BUILDING_MESSAGES.CONSTRUCTION_STARTED,
      {
        buildingName: building.displayName,
        locationCoord: locationCoord,
        constructionTime: building.constructionTimeMinutes
      },
      {
        empireId,
        locationCoord,
        metadata: { buildingId: building.id, buildingType }
      }
    );

    // Broadcast to Socket.IO
    req.io?.broadcastToEmpire(empireId, 'game:message', gameMessage);
    req.io?.broadcastQueueUpdate(empireId, locationCoord, 'construction:started', {
      building,
      message: gameMessage
    });

    // Send API response
    const response = createSuccessResponse(
      { building, message: gameMessage },
      {
        message: 'Construction started successfully',
        statusCode: HttpStatusCode.CREATED,
        metadata: {
          buildingId: building.id,
          estimatedCompletion: building.constructionCompleted
        }
      }
    );

    sendApiResponse(res, response);

  } catch (error) {
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(errorCode, message, { details });
    sendApiResponse(res, response);
  }
};

// =============================================================================
// 3. PAGINATED LIST ENDPOINTS
// =============================================================================

// Buildings list with enhanced pagination
export const getBuildingsList = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, locationCoord } = req.query;
    const empireId = req.user.gameProfile.empireId;

    const { buildings, total } = await getBuildingsForEmpire(
      empireId,
      locationCoord as string,
      Number(page),
      Number(limit)
    );

    // Create pagination metadata
    const paginationMeta = {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrevious: Number(page) > 1
    };

    const response = createListResponse(
      buildings,
      paginationMeta,
      {
        message: `Retrieved ${buildings.length} buildings`,
        metadata: {
          locationCoord,
          empireId,
          cacheKey: `buildings_${empireId}_${locationCoord}_${page}`
        }
      }
    );

    sendApiResponse(res, response);

  } catch (error) {
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(errorCode, message, { details });
    sendApiResponse(res, response);
  }
};

// =============================================================================
// 4. AUTHENTICATION ENDPOINTS WITH MESSAGES
// =============================================================================

// Login endpoint with success messaging
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Authenticate user
    const authResult = await authenticateUser(email, password);
    
    if (!authResult.success) {
      const response = createErrorResponse(
        ApiErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        { statusCode: HttpStatusCode.UNAUTHORIZED }
      );
      return sendApiResponse(res, response);
    }

    const { user, token, refreshToken, empire } = authResult;

    // Create login success message
    const gameMessage = processMessageTemplate(
      AUTH_MESSAGES.LOGIN_SUCCESS,
      { username: user.username },
      {
        userId: user.id,
        timestamp: new Date(),
        metadata: { loginMethod: 'password' }
      }
    );

    // Send to user's Socket.IO room
    req.io?.sendToUser(user.id, 'game:message', gameMessage);

    const response = createSuccessResponse(
      { user, token, refreshToken, empire },
      {
        message: 'Login successful',
        statusCode: HttpStatusCode.OK,
        metadata: {
          loginTime: new Date().toISOString(),
          hasEmpire: !!empire
        }
      }
    );

    sendApiResponse(res, response);

  } catch (error) {
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(errorCode, message, { details });
    sendApiResponse(res, response);
  }
};

// =============================================================================
// 5. BULK OPERATIONS WITH PROGRESS TRACKING
// =============================================================================

// Bulk building operations
export const bulkConstructBuildings = async (req: Request, res: Response) => {
  try {
    const { buildings } = req.body; // Array of construction requests
    const empireId = req.user.gameProfile.empireId;

    const successful: any[] = [];
    const failed: Array<{ item: any; error: any }> = [];

    for (const buildingRequest of buildings) {
      try {
        const building = await startBuildingConstruction(
          empireId, 
          buildingRequest.locationCoord, 
          buildingRequest.buildingType
        );
        successful.push(building);

        // Send individual success message
        const message = processMessageTemplate(
          BUILDING_MESSAGES.CONSTRUCTION_STARTED,
          {
            buildingName: building.displayName,
            locationCoord: buildingRequest.locationCoord,
            constructionTime: building.constructionTimeMinutes
          }
        );
        req.io?.broadcastToEmpire(empireId, 'game:message', message);

      } catch (error) {
        const { errorCode, message } = standardizeError(error);
        failed.push({
          item: buildingRequest,
          error: { message, code: errorCode }
        });
      }
    }

    // Create bulk operation response
    const response = {
      success: failed.length === 0,
      successCount: successful.length,
      errorCount: failed.length,
      successful,
      failed,
      message: `Bulk construction: ${successful.length} successful, ${failed.length} failed`,
      requestId: `bulk_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    res.status(failed.length === 0 ? 200 : 207).json(response); // 207 = Multi-Status

  } catch (error) {
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(errorCode, message, { details });
    sendApiResponse(res, response);
  }
};

// =============================================================================
// 6. MIDDLEWARE FOR CONSISTENT ERROR HANDLING
// =============================================================================

// Enhanced error handling middleware
export const enhancedErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error with context
  console.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    empireId: req.user?.gameProfile?.empireId,
    timestamp: new Date().toISOString()
  });

  // Create standardized error response
  const { errorCode, message, details } = standardizeError(error);
  const response = createErrorResponse(errorCode, message, {
    details,
    metadata: {
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });

  sendApiResponse(res, response);
};

// =============================================================================
// 7. HELPER FUNCTIONS FOR VALIDATION AND MESSAGING
// =============================================================================

// Validation helper with detailed error responses
export const validateEmpireAccess = async (userId: string, empireId: string) => {
  const empire = await findEmpireById(empireId);
  
  if (!empire) {
    return {
      success: false,
      errorCode: ApiErrorCode.EMPIRE_NOT_FOUND,
      message: 'Empire not found',
      details: [{ field: 'empireId', message: 'The specified empire does not exist' }]
    };
  }

  if (empire.userId !== userId) {
    return {
      success: false,
      errorCode: ApiErrorCode.ACCESS_DENIED,
      message: 'Access denied to empire',
      details: [{ field: 'empireId', message: 'You do not have access to this empire' }]
    };
  }

  return { success: true, empire };
};

// Message broadcasting helper
export const broadcastEmpireMessage = (
  io: any,
  empireId: string,
  template: any,
  variables: Record<string, any>,
  context?: any
) => {
  const message = processMessageTemplate(template, variables, {
    empireId,
    timestamp: new Date(),
    ...context
  });

  io.broadcastToEmpire(empireId, 'game:message', message);
  return message;
};

// System maintenance message example
export const broadcastMaintenanceMessage = (io: any, estimatedEndTime: string) => {
  const message = createSystemMessage(
    'warning',
    `Server maintenance in progress. Expected completion: ${estimatedEndTime}`,
    {
      persistent: true,
      metadata: {
        maintenanceId: `maint_${Date.now()}`,
        estimatedEnd: estimatedEndTime
      }
    }
  );

  // Broadcast to all connected users
  io.emit('game:message', message);
  return message;
};

// =============================================================================
// 8. MIDDLEWARE FOR AUTOMATIC MESSAGE INTEGRATION
// =============================================================================

// Middleware to add Socket.IO to request object
export const addSocketIO = (io: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.io = io;
    next();
  };
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      io?: any; // Socket.IO server instance
      user?: {
        id: string;
        username: string;
        email: string;
        gameProfile: {
          empireId?: string;
          startingCoordinate?: string;
        };
      };
    }
  }
}

// Example usage in Express app setup:
/*
import express from 'express';
import { Server } from 'socket.io';
import http from 'http';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Add middleware
app.use(addSocketIO(io));

// Use enhanced error handler
app.use(enhancedErrorHandler);

// Routes
app.get('/api/empire/:id', getEmpire);
app.post('/api/buildings/construct', startConstruction);
app.get('/api/buildings', getBuildingsList);
app.post('/auth/login', login);
app.post('/api/buildings/bulk-construct', bulkConstructBuildings);
*/

// =============================================================================
// 9. PLACEHOLDER FUNCTIONS (TO BE IMPLEMENTED)
// =============================================================================

async function findEmpireById(id: string): Promise<any> {
  // Implementation depends on your database setup
  throw new Error('Not implemented');
}

async function validateConstructionRequirements(empireId: string, buildingType: string, locationCoord: string) {
  // Implementation depends on your game logic
  throw new Error('Not implemented');
}

async function startBuildingConstruction(empireId: string, locationCoord: string, buildingType: string) {
  // Implementation depends on your game logic
  throw new Error('Not implemented');
}

async function getBuildingsForEmpire(empireId: string, locationCoord: string, page: number, limit: number) {
  // Implementation depends on your database setup
  throw new Error('Not implemented');
}

async function authenticateUser(email: string, password: string) {
  // Implementation depends on your auth system
  throw new Error('Not implemented');
}