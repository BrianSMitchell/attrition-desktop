/**
 * @fileoverview Database model and query type definitions
 * Types for data models, database operations, and queries
 */

/**
 * Base database entity
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * User entity/model
 */
export interface User extends BaseEntity {
  email: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  profile?: UserProfile;
}

/**
 * User profile
 */
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  timezone?: string;
}

/**
 * Account entity
 */
export interface Account extends BaseEntity {
  userId: string;
  email: string;
  accountType: AccountType;
  status: AccountStatus;
  metadata?: Record<string, any>;
}

/**
 * Account type enum
 */
export enum AccountType {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

/**
 * Account status enum
 */
export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed'
}

/**
 * Game entity
 */
export interface Game extends BaseEntity {
  title: string;
  description: string;
  ownerId: string;
  status: GameStatus;
  settings: GameSettings;
  statistics: GameStatistics;
}

/**
 * Game status enum
 */
export enum GameStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

/**
 * Game settings
 */
export interface GameSettings {
  maxPlayers: number;
  minPlayers: number;
  difficulty: GameDifficulty;
  timeLimit?: number;
  isPublic: boolean;
  allowSpectators: boolean;
}

/**
 * Game difficulty enum
 */
export enum GameDifficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
  EXPERT = 'expert'
}

/**
 * Game statistics
 */
export interface GameStatistics {
  totalPlayers: number;
  totalRounds: number;
  averageGameTime: number;
  totalViews: number;
}

/**
 * Player entity
 */
export interface Player extends BaseEntity {
  userId: string;
  gameId: string;
  username: string;
  status: PlayerStatus;
  score: number;
  stats: PlayerStats;
}

/**
 * Player status enum
 */
export enum PlayerStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
  DISCONNECTED = 'disconnected',
  ELIMINATED = 'eliminated'
}

/**
 * Player statistics
 */
export interface PlayerStats {
  kills: number;
  deaths: number;
  assists: number;
  accuracy?: number;
  winRate?: number;
  playtime: number;
}

/**
 * Round entity
 */
export interface Round extends BaseEntity {
  gameId: string;
  roundNumber: number;
  status: RoundStatus;
  startedAt: Date;
  endedAt?: Date;
  results: RoundResult[];
}

/**
 * Round status enum
 */
export enum RoundStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

/**
 * Round result
 */
export interface RoundResult {
  playerId: string;
  position: number;
  score: number;
  kills?: number;
  deaths?: number;
}

/**
 * Event/Activity log entity
 */
export interface ActivityLog extends BaseEntity {
  userId: string;
  gameId?: string;
  action: ActivityAction;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Activity action enum
 */
export enum ActivityAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  JOIN = 'join',
  LEAVE = 'leave',
  START = 'start',
  END = 'end',
  ERROR = 'error'
}

/**
 * Audit log entity
 */
export interface AuditLog extends BaseEntity {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Setting entity (for configuration)
 */
export interface Setting extends BaseEntity {
  key: string;
  value: any;
  type: SettingType;
  description?: string;
  isGlobal: boolean;
}

/**
 * Setting type enum
 */
export enum SettingType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array'
}

/**
 * Notification entity
 */
export interface NotificationEntity extends BaseEntity {
  userId: string;
  type: DBNotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
}

/**
 * Notification type enum (database)
 */
export enum DBNotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  ALERT = 'alert'
}

/**
 * Token entity (for auth tokens)
 */
export interface TokenEntity extends BaseEntity {
  userId: string;
  token: string;
  type: TokenType;
  expiresAt: Date;
  revokedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Token type enum
 */
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification'
}

/**
 * File upload entity
 */
export interface FileUpload extends BaseEntity {
  userId: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  path: string;
  status: FileStatus;
  metadata?: Record<string, any>;
}

/**
 * File status enum
 */
export enum FileStatus {
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELETED = 'deleted'
}

/**
 * Database query options
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: Record<string, 1 | -1 | 'asc' | 'desc'>;
  select?: string[];
  populate?: string[];
  lean?: boolean;
}

/**
 * Database update result
 */
export interface UpdateResult {
  acknowledged: boolean;
  modifiedCount: number;
  upsertedId?: string;
}

/**
 * Database delete result
 */
export interface DeleteResult {
  acknowledged: boolean;
  deletedCount: number;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  insertedCount: number;
  modifiedCount: number;
  deletedCount: number;
  errors: BulkOperationError[];
}

/**
 * Bulk operation error
 */
export interface BulkOperationError {
  index: number;
  operation: 'insert' | 'update' | 'delete';
  error: string;
}

/**
 * Transaction interface
 */
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  execute<T>(callback: () => Promise<T>): Promise<T>;
}

/**
 * Migration interface
 */
export interface Migration {
  name: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

/**
 * Seed interface
 */
export interface Seed {
  name: string;
  run(): Promise<void>;
}
