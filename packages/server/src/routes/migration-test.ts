/**
 * Test routes for demonstrating the new enhanced API response and messaging patterns
 * These routes showcase the migration from old response formats to new standardized ones
 */

import express, { Request, Response } from 'express';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  sendApiResponse,
  ApiErrorCode,
  HttpStatusCode,
  standardizeError
} from '@game/shared';

const router = express.Router();

/**
 * GET /api/test/hello - Simple success response demonstration
 */
router.get('/hello', async (req: Request, res: Response) => {
  try {
    const response = createSuccessResponse(
      { message: 'Hello from enhanced API!', timestamp: new Date().toISOString() },
      { 
        message: 'Test endpoint responding successfully',
        statusCode: HttpStatusCode.OK
      }
    );
    
    sendApiResponse(res, response);
  } catch (error) {
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(errorCode, message, { details });
    sendApiResponse(res, response);
  }
});

/**
 * GET /api/test/error - Error response demonstration
 */
router.get('/error', async (req: Request, res: Response) => {
  try {
    // Intentionally throw an error to demonstrate error handling
    throw new Error('This is a test error for migration demonstration');
  } catch (error) {
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(
      ApiErrorCode.OPERATION_FAILED, 
      message, 
      { details, statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
    sendApiResponse(res, response);
  }
});

/**
 * POST /api/test/validate - Validation error demonstration
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    
    // Simple validation
    if (!name || !email) {
      const response = createErrorResponse(
        ApiErrorCode.VALIDATION_FAILED,
        'Missing required fields',
        {
          statusCode: HttpStatusCode.BAD_REQUEST,
          details: [
            ...((!name) ? [{ field: 'name', message: 'Name is required' }] : []),
            ...((!email) ? [{ field: 'email', message: 'Email is required' }] : [])
          ]
        }
      );
      return sendApiResponse(res, response);
    }
    
    // Success response
    const response = createSuccessResponse(
      { name, email, validated: true },
      { message: 'Validation successful' }
    );
    
    sendApiResponse(res, response);
  } catch (error) {
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(errorCode, message, { details });
    sendApiResponse(res, response);
  }
});

/**
 * GET /api/test/game-data - Simulated game data with enhanced response
 */
router.get('/game-data', async (req: Request, res: Response) => {
  try {
    // Simulate some game data
    const gameData = {
      empires: [
        { id: 1, name: 'Test Empire 1', credits: 1000 },
        { id: 2, name: 'Test Empire 2', credits: 1500 }
      ],
      buildings: [
        { id: 1, type: 'mine', level: 3, production: 100 },
        { id: 2, type: 'factory', level: 2, production: 75 }
      ],
      meta: {
        totalCount: 2,
        lastUpdated: new Date().toISOString()
      }
    };
    
    const response = createSuccessResponse(gameData, {
      message: 'Game data retrieved successfully',
      metadata: {
        cached: false,
        queryTime: '15ms',
        version: '1.0.0'
      }
    });
    
    sendApiResponse(res, response);
  } catch (error) {
    const { errorCode, message, details } = standardizeError(error);
    const response = createErrorResponse(errorCode, message, { details });
    sendApiResponse(res, response);
  }
});

/**
 * GET /api/test/old-format - Example of OLD format for comparison
 */
router.get('/old-format', (req: Request, res: Response) => {
  // This shows the old response format for comparison
  res.json({
    success: true,
    data: {
      message: 'This is the old response format',
      timestamp: new Date().toISOString()
    },
    message: 'Old format response'
  });
});

export default router;