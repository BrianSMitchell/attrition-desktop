# Node.js Production Standards

## Overview

This document establishes Node.js production standards based on Express.js best practices, performance guidelines, and the specific requirements for the Attrition space strategy game backend. These standards ensure scalable, maintainable, and secure server-side applications.

## Core Node.js Standards

### Project Structure
- **Feature-based organization**: Group related functionality together
- **Separation of concerns**: Clear boundaries between layers
- **Consistent file naming**: Kebab-case for files, PascalCase for classes

### Module System
- **ES6 modules** for new code:
  ```javascript
  // ✅ Preferred
  import express from 'express';
  import { UserManagementService } from './services/UserManagementService.js';

  export { GameController };

  // ❌ Avoid
  const express = require('express');
  module.exports = { GameController };
  ```
- **TypeScript compilation**: All JavaScript files should have TypeScript equivalents

### Error Handling Standards

#### Synchronous Errors
- **Try-catch** for all synchronous operations:
  ```typescript
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    console.error('Operation failed:', error);
    return { success: false, error: error.message };
  }
  ```

#### Asynchronous Errors
- **Promise rejection handling**:
  ```typescript
  // ✅ Good
  someAsyncOperation()
    .then(result => handleResult(result))
    .catch(error => handleError(error));

  // ✅ Also good
  try {
    const result = await someAsyncOperation();
  } catch (error) {
    // Handle error
  }
  ```

#### Global Error Handlers
- **Process-level error handling**:
  ```typescript
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Graceful shutdown
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Graceful shutdown
  });
  ```

### Memory Management

#### Memory Leaks Prevention
- **Event listener cleanup**:
  ```typescript
  class GameService {
    private listeners: Map<string, Function> = new Map();

    addListener(event: string, callback: Function) {
      this.listeners.set(event, callback);
      process.on(event, callback);
    }

    removeListener(event: string) {
      const callback = this.listeners.get(event);
      if (callback) {
        process.off(event, callback);
        this.listeners.delete(event);
      }
    }
  }
  ```
- **Timer cleanup** for game loops
- **Stream cleanup** for file operations

#### Garbage Collection Optimization
- **Object pooling** for frequently created game entities
- **Buffer reuse** for network operations
- **Avoid large object creation** in hot paths

### Async Patterns

#### Promise Usage
- **Native promises** over third-party libraries:
  ```typescript
  // ✅ Good
  async function fetchUserData(userId: string) {
    return await database.query('SELECT * FROM users WHERE id = $1', [userId]);
  }

  // ❌ Avoid
  const fetchUserData = bluebird.promisify(database.query);
  ```

#### Async Control Flow
- **Async/await** for linear control flow:
  ```typescript
  async function processGameAction(action: GameAction) {
    const user = await getUser(action.userId);
    const empire = await getEmpire(user.id);
    const result = await executeAction(action, empire);
    await notifyClients(result);
    return result;
  }
  ```
- **Promise.all** for concurrent operations:
  ```typescript
  async function getDashboardData(empireId: string) {
    const [resources, buildings, research] = await Promise.all([
      getResources(empireId),
      getBuildings(empireId),
      getResearch(empireId)
    ]);

    return { resources, buildings, research };
  }
  ```

## Express.js Standards

### Application Structure
- **Middleware organization**:
  ```typescript
  // app.ts
  const app = express();

  // Security middleware (first)
  app.use(helmet());
  app.use(cors());
  app.use(rateLimit());

  // Body parsing (before routes)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Custom middleware
  app.use(requestLogger);
  app.use(authentication);

  // Routes (organized by feature)
  app.use('/api/auth', authRoutes);
  app.use('/api/game', gameRoutes);
  app.use('/api/admin', adminRoutes);

  // Error handling (last)
  app.use(errorHandler);
  ```

### Route Organization
- **RESTful resource naming**:
  ```
  GET    /api/empires           # List empires
  POST   /api/empires           # Create empire
  GET    /api/empires/:id       # Get specific empire
  PUT    /api/empires/:id       # Update empire
  DELETE /api/empires/:id       # Delete empire
  ```
- **Consistent status codes**:
  - `200`: Success
  - `201`: Created
  - `400`: Bad Request
  - `401`: Unauthorized
  - `403`: Forbidden
  - `404`: Not Found
  - `409`: Conflict
  - `422`: Unprocessable Entity
  - `500`: Internal Server Error

### Middleware Standards
- **Validation middleware**:
  ```typescript
  const validateGameAction = (req: Request, res: Response, next: NextFunction) => {
    const { action, targetId } = req.body;

    if (!action || !targetId) {
      return res.status(400).json({
        error: 'Missing required fields: action, targetId'
      });
    }

    next();
  };
  ```
- **Error handling middleware**:
  ```typescript
  const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.error('Unhandled error:', error);

    res.status(500).json({
      error: 'Internal server error',
      requestId: req.id
    });
  };
  ```

## Database Integration Standards

### Connection Management
- **Connection pooling**:
  ```typescript
  const { Pool } = require('pg');

  const pool = new Pool({
    max: 20,                    // Maximum connections
    min: 2,                     // Minimum connections
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Return error after 2s
  });
  ```
- **Connection health monitoring** and automatic recovery

### Query Patterns
- **Parameterized queries** (prevent SQL injection):
  ```typescript
  // ✅ Good
  const result = await pool.query(
    'SELECT * FROM empires WHERE user_id = $1 AND active = $2',
    [userId, true]
  );

  // ❌ Bad
  const result = await pool.query(
    `SELECT * FROM empires WHERE user_id = '${userId}'` // Vulnerable!
  );
  ```
- **Transaction management** for multi-step operations:
  ```typescript
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('INSERT INTO empires ...', [data]);
    await client.query('INSERT INTO resources ...', [empireId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  ```

## Security Standards

### Authentication & Authorization
- **JWT implementation**:
  ```typescript
  // Token verification middleware
  const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.sendStatus(401);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.sendStatus(403);
    }
  };
  ```
- **Role-based access control** (RBAC) implementation

### Input Validation
- **Schema validation** using Joi or Yup:
  ```typescript
  const gameActionSchema = Joi.object({
    action: Joi.string().valid('attack', 'defend', 'trade').required(),
    targetId: Joi.string().uuid().required(),
    parameters: Joi.object().required()
  });
  ```
- **Sanitization** of all user inputs

### HTTPS & Security Headers
- **Mandatory HTTPS** in production
- **Security headers** via Helmet.js:
  ```typescript
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  }));
  ```

## Performance Standards

### Response Time Optimization
- **Database query optimization**:
  - Use indexes on frequently queried columns
  - Avoid N+1 query problems
  - Implement pagination for large datasets
- **Caching strategy**:
  ```typescript
  // Redis for session storage
  const redis = new Redis();

  app.use(session({
    store: new RedisStore({ client: redis }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }));
  ```
- **Response compression**:
  ```typescript
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
  ```

### Memory Usage Optimization
- **Streaming** for large data responses:
  ```typescript
  app.get('/api/export', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Stream large dataset
    const stream = getLargeDatasetStream();
    stream.pipe(res);
  });
  ```
- **Buffer management** for binary data

### Scalability Patterns
- **Horizontal scaling** support:
  - Stateless session management
  - Database read replicas
  - Load balancing compatibility
- **Rate limiting** to prevent abuse:
  ```typescript
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });

  app.use('/api/', limiter);
  ```

## Monitoring & Logging

### Structured Logging
- **Consistent log format**:
  ```typescript
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'game-service' },
    transports: [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    ]
  });
  ```
- **Request/response logging** middleware
- **Performance monitoring** integration

### Health Checks
- **Health check endpoints**:
  ```typescript
  app.get('/health', async (req, res) => {
    const healthCheck = {
      uptime: process.uptime(),
      timestamp: Date.now(),
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth()
    };

    res.status(healthCheck.database && healthCheck.redis ? 200 : 503)
       .json(healthCheck);
  });
  ```

## Testing Standards

### Unit Testing
- **Service testing** with mocked dependencies:
  ```typescript
  describe('UserManagementService', () => {
    it('should create user successfully', async () => {
      const mockUser = { id: '123', name: 'Test User' };
      jest.spyOn(database, 'createUser').mockResolvedValue(mockUser);

      const result = await UserManagementService.createUser(userData);

      expect(result).toEqual(mockUser);
    });
  });
  ```

### Integration Testing
- **API endpoint testing**:
  ```typescript
  describe('POST /api/empires', () => {
    it('should create empire for authenticated user', async () => {
      const response = await request(app)
        .post('/api/empires')
        .set('Authorization', `Bearer ${token}`)
        .send(empireData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('empireId');
    });
  });
  ```

### Load Testing
- **Performance benchmarks** for critical endpoints
- **Concurrent user simulation** for multiplayer scenarios

## Deployment Standards

### Environment Configuration
- **Environment-specific settings**:
  ```typescript
  const config = {
    development: {
      database: 'localhost:5432',
      redis: 'localhost:6379',
      logging: 'debug'
    },
    production: {
      database: process.env.DATABASE_URL,
      redis: process.env.REDIS_URL,
      logging: 'warn'
    }
  };
  ```
- **Secrets management** using environment variables

### Container Optimization
- **Multi-stage Docker builds**:
  ```dockerfile
  # Build stage
  FROM node:18-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production

  # Production stage
  FROM node:18-alpine AS production
  WORKDIR /app
  COPY --from=builder /app/node_modules ./node_modules
  COPY . .
  CMD ["npm", "start"]
  ```
- **Security hardening** in production containers

## Best Practices Summary

### Do
- ✅ Use async/await for asynchronous operations
- ✅ Implement proper error handling at all levels
- ✅ Use parameterized queries for database operations
- ✅ Implement rate limiting and security middleware
- ✅ Use connection pooling for database connections
- ✅ Implement structured logging with correlation IDs

### Don't
- ❌ Block the event loop with synchronous operations
- ❌ Use string concatenation for SQL queries
- ❌ Store sensitive data in code or logs
- ❌ Use deprecated Node.js APIs
- ❌ Create memory leaks with uncleaned listeners/timers
- ❌ Deploy without proper monitoring and logging

## References

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Connection Pooling](https://node-postgres.com/features/pooling)
- [Production Node.js Considerations](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)

## Version History

- **v1.0**: Initial standards based on Node.js 18+ and Express.js
- **v1.1**: Added game-specific patterns and real-time system considerations
- **v1.2**: Enhanced security and performance optimization guidelines

## Last Updated

2025-10-10