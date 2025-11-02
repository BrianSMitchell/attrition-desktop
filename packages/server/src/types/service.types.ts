/**
 * @fileoverview Service layer type definitions
 * Types for business logic services and domain models
 */

import type { AuthUser } from './request.types';

/**
 * Service base interface
 */
export interface BaseService {
  initialize(): Promise<void>;
  health(): Promise<boolean>;
}

/**
 * Result type for operations that may fail
 */
export interface Result<T, E = Error> {
  ok: boolean;
  value?: T;
  error?: E;
}

/**
 * Generic repository interface
 */
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(params?: QueryParams): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
  exists(id: ID): Promise<boolean>;
  count(filters?: Record<string, any>): Promise<number>;
}

/**
 * Query parameters for repository operations
 */
export interface QueryParams {
  limit?: number;
  offset?: number;
  sort?: Record<string, 'asc' | 'desc'>;
  filter?: Record<string, any>;
}

/**
 * Cache interface
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Event emitter interface
 */
export interface EventEmitter {
  emit(event: string, data: any): void;
  on(event: string, handler: EventHandler): void;
  off(event: string, handler?: EventHandler): void;
}

/**
 * Event handler function type
 */
export type EventHandler = (data: any) => void | Promise<void>;

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
}

/**
 * Authentication service interface
 */
export interface AuthenticationService extends BaseService {
  login(email: string, password: string): Promise<AuthToken>;
  logout(userId: string): Promise<void>;
  validateToken(token: string): Promise<AuthUser>;
  refreshToken(token: string): Promise<AuthToken>;
  register(email: string, password: string, username?: string): Promise<AuthUser>;
}

/**
 * Authentication token
 */
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Email service interface
 */
export interface EmailService extends BaseService {
  sendEmail(to: string, subject: string, body: string, html?: string): Promise<void>;
  sendTemplate(to: string, templateId: string, data: Record<string, any>): Promise<void>;
}

/**
 * File storage service interface
 */
export interface StorageService extends BaseService {
  upload(file: Buffer, path: string, options?: StorageOptions): Promise<StorageFile>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  list(prefix: string): Promise<StorageFile[]>;
}

/**
 * Storage options
 */
export interface StorageOptions {
  contentType?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
}

/**
 * Storage file metadata
 */
export interface StorageFile {
  path: string;
  size: number;
  contentType: string;
  lastModified: Date;
  url?: string;
}

/**
 * Notification service interface
 */
export interface NotificationService extends BaseService {
  notify(userId: string, notification: Notification): Promise<void>;
  notifyMany(userIds: string[], notification: Notification): Promise<void>;
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
}

/**
 * Notification structure
 */
export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt?: Date;
}

/**
 * Notification types
 */
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  ALERT = 'alert'
}

/**
 * Queue service for async jobs
 */
export interface QueueService extends BaseService {
  enqueue(jobType: string, data: any, options?: JobOptions): Promise<string>;
  dequeue(jobType: string, count?: number): Promise<Job[]>;
  complete(jobId: string): Promise<void>;
  fail(jobId: string, error: string): Promise<void>;
  getStatus(jobId: string): Promise<JobStatus | null>;
}

/**
 * Job structure
 */
export interface Job {
  id: string;
  type: string;
  data: any;
  status: JobStatus;
  attempts: number;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Job status enum
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter'
}

/**
 * Job options
 */
export interface JobOptions {
  priority?: number;
  delay?: number;
  maxAttempts?: number;
  timeout?: number;
}

/**
 * Metrics/Monitoring service interface
 */
export interface MetricsService extends BaseService {
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
  recordTimer(name: string, duration: number, tags?: Record<string, string>): void;
  recordError(name: string, error: Error, tags?: Record<string, string>): void;
  getMetrics(name?: string): Promise<Metric[]>;
}

/**
 * Metric structure
 */
export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

/**
 * Search service interface
 */
export interface SearchService extends BaseService {
  index(document: SearchDocument): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  delete(documentId: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Search document
 */
export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  metadata?: Record<string, any>;
}

/**
 * Search result
 */
export interface SearchResult extends SearchDocument {
  score: number;
}

/**
 * Search options
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  sortBy?: string;
}
