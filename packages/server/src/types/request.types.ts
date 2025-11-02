/**
 * @fileoverview Request/Response type definitions
 * Types for HTTP requests, responses, and middleware
 */

import type { Request, Response, NextFunction } from 'express';
import type { JSONObject } from './index';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  token?: string;
  requestId?: string;
}

/**
 * Authenticated user information
 */
export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  roles: UserRole[];
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User role enum
 */
export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest'
}

/**
 * Request context that flows through middleware
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  startTime: number;
  userAgent?: string;
  ipAddress?: string;
  method: string;
  path: string;
}

/**
 * Request validation error details
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Request body for login
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Request body for registration
 */
export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
  confirmPassword: string;
}

/**
 * Request body for password reset
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Request body for password reset confirmation
 */
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Generic paginated request parameters
 */
export interface PaginatedRequest {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

/**
 * Middleware type for Express
 */
export type Middleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Error middleware type
 */
export type ErrorMiddleware = (
  err: Error,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Request handler function type
 */
export type RequestHandler<T = any> = (
  req: AuthenticatedRequest,
  res: Response
) => Promise<T> | T;

/**
 * Response status codes
 */
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

/**
 * Standard API response structure
 */
export interface StandardResponse<T = any> {
  status: 'success' | 'error';
  statusCode: HttpStatusCode;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: ValidationErrorDetail[];
  };
  meta?: {
    timestamp: number;
    requestId?: string;
  };
}

/**
 * Webhook request payload
 */
export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: number;
  data: JSONObject;
  signature: string;
}

/**
 * Event payload for pub/sub systems
 */
export interface EventPayload<T = any> {
  id: string;
  type: string;
  source: string;
  timestamp: number;
  data: T;
  metadata?: Record<string, any>;
}
