import { Router } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

// Create base router with authentication
const createBaseRouter = () => {
  const router = Router();
  router.use(authenticate); // All game routes require authentication
  return router;
};

export { createBaseRouter, Router, AuthRequest, asyncHandler };