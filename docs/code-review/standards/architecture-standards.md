# Architecture Standards - Attrition System Patterns

## Overview

This document defines the architectural standards and patterns for the Attrition space strategy game. These standards ensure system consistency, maintainability, and scalability while supporting the unique requirements of a real-time multiplayer game.

## System Architecture Principles

### Core Principles

#### 1. Service-Oriented Architecture
**Pattern**: Clean separation of business logic from HTTP concerns

```typescript
// ✅ Preferred: Service extraction pattern
// Route handlers: HTTP concerns only
router.post('/buildings', async (req, res) => {
  try {
    const result = await BuildingService.createBuilding(req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Service classes: Business logic only
export class BuildingService {
  public static async createBuilding(request: CreateBuildingRequest): Promise<Building> {
    // Pure business logic - no HTTP dependencies
    this.validateRequest(request);
    const building = await this.performCreation(request);
    await this.updateGameState(building);
    return building;
  }
}
```

**Benefits**:
- **Testability**: Business logic can be tested independently
- **Reusability**: Services can be used across multiple routes
- **Maintainability**: Changes to business logic don't affect HTTP layer
- **Readability**: Route handlers focus only on HTTP concerns

#### 2. Domain-Driven Design
**Pattern**: Organize code around business domains and capabilities

```typescript
// ✅ Preferred: Domain-focused organization
src/
  features/
    auth/
      services/
        user-management.service.ts
        authentication.service.ts
      controllers/
        auth.controller.ts
      types/
        auth.types.ts
    game/
      services/
        resource-calculation.service.ts
        empire-management.service.ts
        fleet-movement.service.ts
      controllers/
        game.controller.ts
      types/
        game.types.ts
    buildings/
      services/
        building-construction.service.ts
        building-upgrade.service.ts
      controllers/
        building.controller.ts
      types/
        building.types.ts

// ❌ Avoid: Technical organization
src/
  services/
    auth.service.ts
    game.service.ts
    building.service.ts
  controllers/
    auth.controller.ts
    game.controller.ts
    building.controller.ts
```

#### 3. Real-time Architecture
**Pattern**: Efficient real-time updates for multiplayer gaming

```typescript
// ✅ Preferred: Optimized real-time patterns
export class GameStateBroadcaster {
  private static updateBuffer: Map<string, GameStateUpdate> = new Map();
  private static broadcastTimer?: NodeJS.Timeout;

  public static queueStateUpdate(empireId: string, update: GameStateUpdate): void {
    // Buffer updates to avoid excessive broadcasting
    this.updateBuffer.set(empireId, update);

    if (!this.broadcastTimer) {
      this.broadcastTimer = setTimeout(() => {
        this.flushUpdates();
      }, 100); // Batch updates every 100ms
    }
  }

  private static flushUpdates(): void {
    const updates = Array.from(this.updateBuffer.values());
    this.updateBuffer.clear();

    if (updates.length > 0) {
      // Send batched updates to reduce WebSocket traffic
      this.socket.emit('game-state-batch', {
        updates: updates.map(update => this.sanitizeForBroadcast(update)),
        timestamp: Date.now()
      });
    }

    this.broadcastTimer = undefined;
  }
}
```

## Layer Architecture

### 1. Presentation Layer (React Frontend)

#### Component Architecture
```typescript
// ✅ Preferred: Feature-based component organization
features/
  game-dashboard/
    components/
      resource-panel/
        index.tsx
        resource-display.tsx
        resource-tooltip.tsx
      building-panel/
        index.tsx
        building-list.tsx
        building-item.tsx
    hooks/
      use-game-state.ts
      use-resources.ts
      use-buildings.ts
    types/
      game-dashboard.types.ts
    styles/
      game-dashboard.module.css

// ✅ Preferred: Smart vs Presentational components
interface GameDashboardProps {
  empireId: string;
  onAction: (action: GameAction) => void;
}

export const GameDashboard: React.FC<GameDashboardProps> = ({
  empireId,
  onAction
}) => {
  // Smart component: Contains business logic and state management
  const { gameState, isLoading, error } = useGameState(empireId);
  const { resources } = useResources(empireId);
  const { buildings, constructBuilding } = useBuildings(empireId);

  const handleBuildingConstruction = useCallback((buildingType: BuildingType) => {
    constructBuilding(buildingType);
    onAction({ type: 'BUILDING_CONSTRUCTED', buildingType });
  }, [constructBuilding, onAction]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBoundary error={error} />;

  return (
    <div className={styles.dashboard}>
      <ResourcePanel resources={resources} />
      <BuildingPanel
        buildings={buildings}
        onConstruct={handleBuildingConstruction}
      />
    </div>
  );
};
```

#### State Management Patterns
```typescript
// ✅ Preferred: Centralized state management
export const useGameState = (empireId: string) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadGameState = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const state = await GameAPI.getGameState(empireId);

        if (mounted) {
          setGameState(state);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    loadGameState();

    return () => {
      mounted = false;
    };
  }, [empireId]);

  return { gameState, isLoading, error, refetch: loadGameState };
};
```

### 2. Application Layer (Node.js Backend)

#### Service Layer Architecture
```typescript
// ✅ Preferred: Domain service pattern
export abstract class BaseService {
  protected abstract readonly serviceName: string;

  protected log(level: LogLevel, message: string, context?: any): void {
    logger.log(level, `[${this.serviceName}] ${message}`, context);
  }

  protected handleError(operation: string, error: Error): never {
    this.log('error', `Operation failed: ${operation}`, { error: error.message });
    throw error;
  }
}

export class ResourceCalculationService extends BaseService {
  protected readonly serviceName = 'ResourceCalculationService';

  public static async calculateDashboardResources(empire: Empire): Promise<DashboardResources> {
    this.log('debug', 'Calculating dashboard resources', { empireId: empire.id });

    try {
      const metalProduction = this.calculateMetalProduction(empire);
      const crystalProduction = this.calculateCrystalProduction(empire);
      const deuteriumProduction = this.calculateDeuteriumProduction(empire);
      const energyProduction = this.calculateEnergyProduction(empire);

      return {
        metal: metalProduction,
        crystal: crystalProduction,
        deuterium: deuteriumProduction,
        energy: energyProduction,
        lastCalculated: new Date()
      };
    } catch (error) {
      this.handleError('calculateDashboardResources', error as Error);
    }
  }
}
```

#### Controller Layer Pattern
```typescript
// ✅ Preferred: Controller pattern for HTTP orchestration
export class DashboardController {
  public static async getDashboardData(
    empire: Empire,
    userId: string
  ): Promise<DashboardResponse> {
    // Pure orchestration - no HTTP concerns
    const resources = await ResourceCalculationService.calculateDashboardResources(empire);
    const credits = await CreditService.calculateCreditsPerHour(empire);
    const research = await ResearchService.getCurrentResearch(empire.id);
    const buildings = await BuildingService.getBuildingQueue(empire.id);

    return {
      resources,
      credits,
      research,
      buildings,
      timestamp: new Date()
    };
  }

  public static formatDashboardResponse(data: DashboardResponse): FormattedDashboardResponse {
    return {
      success: true,
      data: {
        resources: data.resources,
        credits: data.credits,
        research: data.research,
        buildings: data.buildings
      },
      timestamp: data.timestamp
    };
  }
}

// Route handler: HTTP concerns only
router.get('/dashboard', async (req, res) => {
  try {
    const empire = await EmpireResolutionService.resolveEmpireByUserId(req.user.id);
    const data = await DashboardController.getDashboardData(empire, req.user.id);
    const response = DashboardController.formatDashboardResponse(data);

    return res.json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to load dashboard'
    });
  }
});
```

### 3. Data Layer (Supabase Integration)

#### Repository Pattern
```typescript
// ✅ Preferred: Repository pattern for data access
export abstract class BaseRepository<T> {
  protected abstract readonly tableName: string;

  public async findById(id: string): Promise<T | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to find ${this.tableName} by id: ${error.message}`);
    }

    return data as T;
  }

  public async findMany(criteria: Record<string, any>): Promise<T[]> {
    let query = supabase.from(this.tableName).select('*');

    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to find ${this.tableName}: ${error.message}`);
    }

    return (data || []) as T[];
  }

  public async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(`Failed to create ${this.tableName}: ${error.message}`);
    }

    return result as T;
  }
}

export class BuildingRepository extends BaseRepository<Building> {
  protected readonly tableName = 'buildings';

  public async findByEmpire(empireId: string): Promise<Building[]> {
    return this.findMany({ empire_id: empireId });
  }

  public async findByLocation(empireId: string, x: number, y: number): Promise<Building | null> {
    const buildings = await this.findMany({ empire_id: empireId, x, y });
    return buildings[0] || null;
  }
}
```

#### Data Transfer Objects (DTOs)
```typescript
// ✅ Preferred: Structured DTOs for API contracts
export interface CreateBuildingRequest {
  readonly empireId: string;
  readonly buildingType: BuildingType;
  readonly x: number;
  readonly y: number;
  readonly quantity?: number;
}

export interface BuildingResponse {
  readonly id: string;
  readonly type: BuildingType;
  readonly level: number;
  readonly empireId: string;
  readonly x: number;
  readonly y: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DashboardResources {
  readonly metal: number;
  readonly crystal: number;
  readonly deuterium: number;
  readonly energy: number;
  readonly lastCalculated: Date;
}
```

## Component Relationships

### Dependency Injection Pattern
```typescript
// ✅ Preferred: Dependency injection for testability
export class GameService {
  constructor(
    private readonly resourceService: ResourceService,
    private readonly buildingService: BuildingService,
    private readonly researchService: ResearchService
  ) {}

  public async processGameTick(empireId: string): Promise<void> {
    // Use injected services instead of direct instantiation
    await this.resourceService.updateResources(empireId);
    await this.buildingService.processCompletions(empireId);
    await this.researchService.processResearch(empireId);
  }
}

// ✅ Preferred: Service locator for simple cases
export class ServiceFactory {
  private static services: Map<string, any> = new Map();

  public static register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  public static get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not registered: ${key}`);
    }
    return service;
  }
}
```

### Event-Driven Architecture
```typescript
// ✅ Preferred: Event-driven patterns for loose coupling
export class GameEventEmitter {
  private static listeners: Map<string, Function[]> = new Map();

  public static on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  public static off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  public static emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          logger.error('Event listener error', { event, error });
        }
      });
    }
  }
}

// Usage in services
export class BuildingService {
  public static async createBuilding(request: CreateBuildingRequest): Promise<Building> {
    const building = await this.performCreation(request);

    // Emit event for other services to react
    GameEventEmitter.emit('building.created', {
      building,
      empireId: request.empireId
    });

    return building;
  }
}

export class AchievementService {
  constructor() {
    // Listen for building creation events
    GameEventEmitter.on('building.created', this.handleBuildingCreated.bind(this));
  }

  private async handleBuildingCreated(event: BuildingCreatedEvent): Promise<void> {
    // Check and award achievements based on building creation
    await this.checkBuildingAchievements(event.empireId, event.building);
  }
}
```

## Real-time System Architecture

### WebSocket Management
```typescript
// ✅ Preferred: Centralized WebSocket management
export class WebSocketManager {
  private static io: Server;
  private static connections: Map<string, Socket> = new Map();

  public static initialize(server: Server): void {
    this.io = new SocketIO(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  private static handleConnection(socket: Socket): void {
    socket.on('authenticate', async (token: string) => {
      try {
        const user = await AuthService.validateToken(token);
        if (user) {
          socket.userId = user.id;
          this.connections.set(user.id, socket);

          socket.emit('authenticated', { success: true });
          this.log('info', 'User authenticated via WebSocket', { userId: user.id });
        } else {
          socket.emit('authentication_failed', { error: 'Invalid token' });
          socket.disconnect();
        }
      } catch (error) {
        socket.emit('authentication_failed', { error: 'Authentication error' });
        socket.disconnect();
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        this.connections.delete(socket.userId);
      }
    });
  }

  public static broadcastToUser(userId: string, event: string, data: any): void {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  public static broadcastToEmpire(empireId: string, event: string, data: any): void {
    // Implementation for empire-wide broadcasts
  }
}
```

### Subscription Management
```typescript
// ✅ Preferred: Proper Supabase subscription patterns
export class SubscriptionManager {
  private static subscriptions: Map<string, RealtimeChannel> = new Map();

  public static subscribeToEmpire(empireId: string, callback: (payload: any) => void): string {
    const subscriptionKey = `empire:${empireId}`;

    if (this.subscriptions.has(subscriptionKey)) {
      this.unsubscribe(subscriptionKey);
    }

    const channel = supabase
      .channel(subscriptionKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'empires',
          filter: `id=eq.${empireId}`
        },
        callback
      )
      .subscribe();

    this.subscriptions.set(subscriptionKey, channel);
    return subscriptionKey;
  }

  public static subscribeToBuildings(empireId: string, callback: (payload: any) => void): string {
    const subscriptionKey = `buildings:${empireId}`;

    const channel = supabase
      .channel(subscriptionKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buildings',
          filter: `empire_id=eq.${empireId}`
        },
        callback
      )
      .subscribe();

    this.subscriptions.set(subscriptionKey, channel);
    return subscriptionKey;
  }

  public static unsubscribe(subscriptionKey: string): void {
    const channel = this.subscriptions.get(subscriptionKey);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(subscriptionKey);
    }
  }

  public static unsubscribeAll(): void {
    this.subscriptions.forEach((channel, key) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
  }
}
```

## Error Handling Architecture

### Error Hierarchy
```typescript
// ✅ Preferred: Structured error hierarchy
export abstract class BaseError extends Error {
  public readonly name: string;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Domain-specific errors
export class ValidationError extends BaseError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.field = field;
  }
}

export class ResourceError extends BaseError {
  constructor(message: string, resourceType?: string) {
    super(message, 'RESOURCE_ERROR', 400);
    this.resourceType = resourceType;
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}
```

### Global Error Handling
```typescript
// ✅ Preferred: Centralized error handling
export class ErrorHandler {
  public static handleError(error: Error, context?: any): void {
    // Log error with context
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    });

    // Report to error tracking service
    if (this.shouldReportError(error)) {
      ErrorReportingService.report(error, context);
    }
  }

  public static handleHttpError(error: Error, res: Response): void {
    if (error instanceof BaseError) {
      // Structured error response
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp: error.timestamp
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date()
    });
  }

  private static shouldReportError(error: Error): boolean {
    // Don't report validation errors or client errors
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      return false;
    }

    // Report operational errors for monitoring
    if (error instanceof BaseError) {
      return error.isOperational;
    }

    // Report unknown errors
    return true;
  }
}
```

## Performance Architecture

### Caching Strategy
```typescript
// ✅ Preferred: Multi-level caching strategy
export class CacheManager {
  private static memoryCache: Map<string, CacheEntry> = new Map();
  private static redisClient: RedisClient;

  public static async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Try Redis cache
    if (this.redisClient) {
      const redisData = await this.redisClient.get(key);
      if (redisData) {
        const parsed = JSON.parse(redisData);
        if (!this.isExpired(parsed)) {
          // Restore to memory cache
          this.memoryCache.set(key, parsed);
          return parsed.data as T;
        }
      }
    }

    return null;
  }

  public static async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const entry: CacheEntry = {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    };

    // Set in memory cache
    this.memoryCache.set(key, entry);

    // Set in Redis cache
    if (this.redisClient) {
      await this.redisClient.setex(key, ttlSeconds, JSON.stringify(entry));
    }
  }
}
```

### Background Processing
```typescript
// ✅ Preferred: Proper background job management
export class BackgroundProcessor {
  private static jobQueue: Map<string, ScheduledJob> = new Map();
  private static processingInterval?: NodeJS.Timeout;

  public static scheduleJob(jobId: string, job: ScheduledJob): void {
    this.jobQueue.set(jobId, job);

    if (!this.processingInterval) {
      this.processingInterval = setInterval(() => {
        this.processJobs();
      }, 1000);
    }
  }

  private static async processJobs(): Promise<void> {
    const now = Date.now();
    const jobsToProcess: string[] = [];

    // Find jobs ready for execution
    this.jobQueue.forEach((job, jobId) => {
      if (job.nextRun <= now && !job.isRunning) {
        jobsToProcess.push(jobId);
      }
    });

    // Process jobs concurrently but with limits
    const concurrentLimit = 5;
    for (let i = 0; i < jobsToProcess.length; i += concurrentLimit) {
      const batch = jobsToProcess.slice(i, i + concurrentLimit);
      await Promise.all(batch.map(jobId => this.executeJob(jobId)));
    }
  }

  private static async executeJob(jobId: string): Promise<void> {
    const job = this.jobQueue.get(jobId);
    if (!job) return;

    job.isRunning = true;
    job.lastRun = Date.now();

    try {
      await job.executor();

      // Schedule next run
      job.nextRun = Date.now() + job.interval;

    } catch (error) {
      logger.error('Background job failed', { jobId, error });

      // Exponential backoff for failed jobs
      job.nextRun = Date.now() + Math.min(job.interval * Math.pow(2, job.failureCount), 300000);
      job.failureCount++;

    } finally {
      job.isRunning = false;
    }
  }
}
```

## Security Architecture

### Authentication Architecture
```typescript
// ✅ Preferred: Secure authentication patterns
export class AuthenticationService {
  public static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    // Validate credentials format
    this.validateCredentials(credentials);

    // Find user by email
    const user = await UserRepository.findByEmail(credentials.email);
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check account status
    if (!user.isActive) {
      throw new AuthenticationError('Account is disabled');
    }

    // Generate tokens
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // Log successful authentication
    await AuditLogger.log('user_authenticated', {
      userId: user.id,
      method: 'password'
    });

    return {
      user,
      accessToken,
      refreshToken,
      expiresIn: 3600 // 1 hour
    };
  }
}
```

### Authorization Architecture
```typescript
// ✅ Preferred: Role-based access control
export class AuthorizationService {
  public static async checkPermission(
    userId: string,
    permission: Permission,
    resource?: string
  ): Promise<boolean> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      return false;
    }

    // Check role-based permissions
    if (this.hasRolePermission(user.role, permission)) {
      return true;
    }

    // Check resource-specific permissions
    if (resource) {
      return this.hasResourcePermission(userId, permission, resource);
    }

    return false;
  }

  private static hasRolePermission(role: UserRole, permission: Permission): boolean {
    const rolePermissions: Record<UserRole, Permission[]> = {
      [UserRole.ADMIN]: [
        Permission.MANAGE_USERS,
        Permission.MANAGE_EMPIRES,
        Permission.VIEW_ANALYTICS,
        Permission.MANAGE_GAME
      ],
      [UserRole.PLAYER]: [
        Permission.MANAGE_EMPIRE,
        Permission.VIEW_GAME_STATE,
        Permission.PERFORM_ACTIONS
      ],
      [UserRole.VIEWER]: [
        Permission.VIEW_GAME_STATE
      ]
    };

    return rolePermissions[role]?.includes(permission) || false;
  }
}
```

## Deployment Architecture

### Environment Management
```typescript
// ✅ Preferred: Environment-based configuration
export class EnvironmentConfig {
  public static getDatabaseUrl(): string {
    if (this.isTestEnvironment()) {
      return process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/attrition_test';
    }

    if (this.isProductionEnvironment()) {
      return process.env.PRODUCTION_DATABASE_URL || '';
    }

    return process.env.DEVELOPMENT_DATABASE_URL || 'postgresql://localhost:5432/attrition_dev';
  }

  public static getSupabaseConfig(): SupabaseConfig {
    const url = this.getSupabaseUrl();
    const anonKey = this.getSupabaseAnonKey();
    const serviceRoleKey = this.getSupabaseServiceRoleKey();

    return { url, anonKey, serviceRoleKey };
  }

  private static isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  private static isProductionEnvironment(): boolean {
    return process.env.NODE_ENV === 'production';
  }
}
```

## Monitoring and Observability

### Metrics Collection
```typescript
// ✅ Preferred: Comprehensive metrics collection
export class MetricsCollector {
  public static recordApiCall(endpoint: string, method: string, duration: number): void {
    // Record response time
    this.histogram('api_response_time', duration, { endpoint, method });

    // Record request count
    this.counter('api_requests_total', 1, { endpoint, method });

    // Record errors
    if (duration > 5000) { // Slow request threshold
      this.counter('api_slow_requests_total', 1, { endpoint, method });
    }
  }

  public static recordGameEvent(event: string, empireId: string, data?: any): void {
    this.counter('game_events_total', 1, { event, empireId });
    this.histogram('game_event_processing_time', data?.duration || 0, { event });
  }

  public static recordError(error: Error, context?: any): void {
    this.counter('errors_total', 1, {
      error_type: error.name,
      context: context?.operation || 'unknown'
    });
  }
}
```

### Health Checks
```typescript
// ✅ Preferred: Comprehensive health monitoring
export class HealthChecker {
  public static async performHealthCheck(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkSupabase(),
      this.checkRedis(),
      this.checkWebSocket(),
      this.checkExternalServices()
    ]);

    const results: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date(),
      checks: {}
    };

    checks.forEach((check, index) => {
      const checkNames = ['database', 'supabase', 'redis', 'websocket', 'external'];
      const checkName = checkNames[index];

      if (check.status === 'fulfilled') {
        results.checks[checkName] = check.value;
      } else {
        results.checks[checkName] = {
          status: 'unhealthy',
          error: check.reason.message
        };
      }
    });

    // Overall status determination
    const unhealthyChecks = Object.values(results.checks)
      .filter(check => check.status !== 'healthy');

    if (unhealthyChecks.length > 0) {
      results.status = 'unhealthy';
    }

    return results;
  }
}
```

## Architecture Decision Framework

### When to Use Service Extraction

#### Apply Service Extraction When:
- [ ] Route handler exceeds 50 lines
- [ ] Business logic mixed with HTTP concerns
- [ ] Same logic duplicated across multiple routes
- [ ] Complex business logic needs testing in isolation
- [ ] Logic needs to be reused across different endpoints

#### Keep Logic in Route Handler When:
- [ ] Simple CRUD operations with no business logic
- [ ] Pure data transformation for API responses
- [ ] Basic input validation and sanitization
- [ ] Straightforward error handling

### Database Query Patterns

#### Use Repository Pattern When:
- [ ] Complex business queries requiring multiple tables
- [ ] Domain-specific query logic and validation
- [ ] Caching and performance optimization needed
- [ ] Testing requires mocking database layer

#### Use Direct Supabase When:
- [ ] Simple CRUD operations
- [ ] Straightforward single-table queries
- [ ] No complex business logic in data access
- [ ] Performance optimization not critical

### Real-time Update Patterns

#### Broadcast Updates When:
- [ ] Game state changes affect multiple players
- [ ] Player actions have visible effects on other players
- [ ] Achievement or milestone reached
- [ ] Administrative actions affect player experience

#### Avoid Broadcasting When:
- [ ] Internal state changes not visible to players
- [ ] Temporary calculations or cache updates
- [ ] Sensitive personal information
- [ ] High-frequency updates that could cause performance issues

## Architecture Compliance

### Review Criteria

#### Service Architecture Compliance
- [ ] Route handlers contain only HTTP concerns
- [ ] Business logic extracted to appropriate services
- [ ] Service methods follow single responsibility principle
- [ ] Dependencies injected rather than hardcoded

#### Real-time Architecture Compliance
- [ ] WebSocket updates sent at appropriate intervals
- [ ] Sensitive data filtered from real-time broadcasts
- [ ] Subscription cleanup properly implemented
- [ ] Connection limits and error handling implemented

#### Error Handling Compliance
- [ ] Structured error types used consistently
- [ ] Error context and logging implemented
- [ ] User-friendly error messages provided
- [ ] Sensitive information not exposed in errors

### Architecture Evolution

#### When to Update Architecture Standards
1. **Pattern Proven Ineffective**: Established pattern causes more problems than it solves
2. **Technology Changes**: New technologies enable better architectural approaches
3. **Scale Requirements**: Current architecture doesn't support growth needs
4. **Team Feedback**: Consistent issues reported by development team

#### Architecture Update Process
1. **Propose Changes**: Document proposed architectural changes
2. **Pilot Implementation**: Implement changes in limited scope
3. **Evaluate Results**: Measure impact on development and performance
4. **Team Review**: Get feedback from entire development team
5. **Gradual Migration**: Update standards and migrate existing code

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0
**Status**: Active