# Tech Context - Attrition Development Environment

## Technologies Used

### Core Technology Stack
- **Runtime**: Node.js 20+ (Active LTS)
- **Frontend Framework**: React 18+ with TypeScript 5+
- **Backend Service**: Supabase (PostgreSQL + Real-time APIs)
- **Build Tool**: Vite 5+ for fast development and optimized builds
- **Package Manager**: pnpm for efficient monorepo management
- **Language**: TypeScript for type-safe development

### Development Tools
- **Code Editor**: Visual Studio Code with Roo Code extension
- **Version Control**: Git with GitHub integration
- **Database Management**: Supabase Dashboard and CLI tools
- **API Testing**: Postman/Insomnia for API endpoint testing
- **Containerization**: Docker for development environment consistency

### Monitoring & Analytics
- **Error Tracking**: Comprehensive logging with structured error reporting
- **Performance Monitoring**: Real-time performance metrics collection
- **Analytics**: User behavior and game balance tracking
- **Health Checks**: Automated system health verification

## Development Setup

### Local Development Environment
```bash
# Prerequisites
Node.js 20+ installed
pnpm package manager installed
Git configured

# Clone and setup
git clone <repository-url>
cd attrition
pnpm install

# Environment configuration
cp packages/client/.env.example packages/client/.env.local
cp packages/server/.env.example packages/server/.env.local

# Configure Supabase (local development)
supabase start
supabase db reset

# Run development servers
pnpm dev              # Start all services
pnpm dev:client       # Client only
pnpm dev:server       # Server only
```

### Project Structure
```
attrition/
├── packages/
│   ├── client/           # React frontend application
│   ├── server/           # Node.js backend services
│   └── shared/           # Shared TypeScript types and utilities
├── scripts/              # Build, deployment, and utility scripts
├── config/               # Configuration files and environments
├── docs/                 # Documentation and guides
└── supabase/             # Database migrations and configurations
```

## Technical Constraints

### Performance Constraints
- **Response Time**: All game actions must complete within 500ms
- **Page Load**: Initial game load should complete within 2 seconds
- **Concurrent Users**: Support for 10,000+ simultaneous players
- **Database Queries**: Complex queries must execute within 100ms

### Scalability Constraints
- **Memory Usage**: Efficient memory management for large game states
- **CPU Utilization**: Optimized processing for real-time calculations
- **Storage Growth**: Sustainable data storage patterns for player progression
- **Network Efficiency**: Minimized bandwidth usage for real-time updates

### Security Constraints
- **Data Protection**: All sensitive player data must be encrypted
- **Input Validation**: Comprehensive validation of all user inputs
- **Access Control**: Proper authorization for all game actions
- **Audit Logging**: Complete audit trail for security events

## Dependencies

### Runtime Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@supabase/supabase-js": "^2.38.0",
  "socket.io-client": "^4.7.0",
  "three": "^0.158.0",
  "@types/react": "^18.2.0",
  "@types/node": "^20.0.0"
}
```

### Development Dependencies
```json
{
  "typescript": "^5.2.0",
  "vite": "^5.0.0",
  "eslint": "^8.55.0",
  "prettier": "^3.1.0",
  "@testing-library/react": "^14.1.0",
  "jest": "^29.7.0",
  "supabase": "^1.115.0"
}
```

### Package Management Strategy
- **Monorepo Structure**: Single repository with multiple packages
- **Workspace Management**: pnpm workspaces for dependency management
- **Version Synchronization**: Aligned dependency versions across packages
- **Build Optimization**: Shared build configurations and scripts

## Tool Usage Patterns

### Code Quality Tools
- **Linting**: ESLint with React and TypeScript rules
- **Formatting**: Prettier for consistent code formatting
- **Type Checking**: Strict TypeScript configuration for compile-time safety
- **Testing**: Jest with React Testing Library for component and unit tests

### Database Development
- **Migrations**: Supabase migrations for schema versioning
- **Seeding**: Automated test data generation for development
- **Query Optimization**: Database performance analysis and optimization
- **Backup Strategy**: Regular backups with point-in-time recovery

### Deployment Pipeline
- **Build Process**: Automated builds with asset optimization
- **Environment Management**: Separate configurations for each deployment stage
- **Health Monitoring**: Post-deployment health checks and validation
- **Rollback Strategy**: Automated rollback capabilities for failed deployments

## Development Workflow

### Feature Development Process
1. **Planning**: Define requirements and create task breakdown
2. **Implementation**: Develop feature with comprehensive testing
3. **Review**: Code review and feedback integration
4. **Testing**: Integration and end-to-end testing
5. **Documentation**: Update documentation and memory bank
6. **Deployment**: Release to staging for final validation

### Code Organization Patterns
- **Feature Branches**: Isolated development branches for new features
- **Pull Requests**: Required reviews before merging to main branch
- **Semantic Commits**: Structured commit messages for better history
- **Release Tags**: Versioned releases with changelog documentation

## Environment Configurations

### Development Environment
- **Debug Mode**: Enabled for detailed logging and error reporting
- **Hot Reload**: Instant updates during development
- **Test Data**: Pre-populated test scenarios for development
- **Local Database**: Isolated development database instance

### Testing Environment
- **Automated Tests**: Comprehensive test suites for all components
- **Performance Testing**: Load testing for scalability validation
- **Integration Testing**: End-to-end workflow validation
- **Staging Data**: Production-like data for realistic testing

### Production Environment
- **Optimized Build**: Minified and compressed assets for performance
- **Error Monitoring**: Real-time error tracking and alerting
- **Performance Monitoring**: Continuous performance metric collection
- **Security Headers**: Enhanced security configurations

## Performance Optimization

### Frontend Optimization
- **Code Splitting**: Automatic route-based code splitting
- **Lazy Loading**: Component and asset lazy loading for faster initial loads
- **Caching Strategy**: Aggressive caching of static assets and API responses
- **Bundle Optimization**: Tree shaking and dead code elimination

### Backend Optimization
- **Database Indexing**: Strategic indexing for query performance
- **Query Optimization**: Efficient database queries with proper joins
- **Connection Pooling**: Optimized database connection management
- **Response Compression**: Compressed API responses for reduced bandwidth

### Real-time Optimization
- **WebSocket Management**: Efficient connection handling and multiplexing
- **Subscription Optimization**: Targeted subscriptions for relevant updates only
- **State Synchronization**: Minimal data transfer for state updates
- **Offline Support**: Graceful handling of connection interruptions

## Security Considerations

### Authentication Security
- **JWT Handling**: Secure token management and automatic refresh
- **Session Security**: Proper session timeout and invalidation
- **Password Security**: Strong password requirements and secure storage
- **Multi-factor Authentication**: Optional enhanced security for player accounts

### Data Security
- **Encryption at Rest**: Database encryption for sensitive data
- **Encryption in Transit**: TLS encryption for all communications
- **Input Sanitization**: Comprehensive input validation and sanitization
- **SQL Injection Prevention**: Parameterized queries and stored procedures

## Deployment Strategy

### Infrastructure Setup
- **Hosting Platform**: Supabase for backend services and database
- **CDN Integration**: Content delivery network for static assets
- **Domain Management**: DNS configuration and SSL certificate management
- **Monitoring Setup**: Logging, metrics, and alerting configuration

### Release Management
- **Version Control**: Semantic versioning for releases
- **Changelog Management**: Detailed release notes and change documentation
- **Rollback Procedures**: Emergency rollback capabilities
- **Feature Flags**: Gradual feature rollout and testing

## Troubleshooting Patterns

### Common Development Issues
- **Build Errors**: Dependency conflicts or TypeScript compilation issues
- **Runtime Errors**: Database connection or API communication problems
- **Performance Issues**: Inefficient queries or memory leaks
- **Real-time Sync**: WebSocket connection or subscription problems

### Debugging Strategies
- **Logging Levels**: Adjustable logging for different environments
- **Error Tracking**: Structured error reporting with context
- **Performance Profiling**: Built-in performance monitoring tools
- **Remote Debugging**: Browser developer tools for client-side debugging

## Future Technical Considerations

### Route Migration Methodology (Phase 5)

#### MongoDB to Supabase Route Migration Approach
- **Strategy**: Systematic conversion of API routes from MongoDB/Mongoose to Supabase
- **Pattern**: Database type detection with conditional implementation paths
- **Migration Order**: Foundation routes first, then complex interdependent routes

##### Technical Implementation Steps
1. **Database Type Detection**: Use existing `getDatabaseType()` configuration
2. **Supabase Path Implementation**: Complete Supabase-only route logic
3. **MongoDB Fallback Retention**: Keep MongoDB code for rollback capability
4. **Gradual Rollout**: Route-by-route migration for risk management
5. **Verification**: Comprehensive testing before marking routes as complete

##### Key Technical Patterns Established

###### UUID Handling Strategy
- **Supabase ID Format**: Standard UUID v4 format for all primary keys
- **Validation Pattern**: Regex-based validation for format compliance
- **Error Handling**: Clear error messages for invalid ID formats
- **Consistency**: Applied across all routes handling entity IDs

###### Query Optimization Techniques
- **Count Queries**: Use `head: true` to avoid data transfer for counts only
- **Pagination**: Efficient `range()` method for large dataset pagination
- **Complex Filters**: Single-query authorization checks with OR conditions
- **Performance**: Database-level filtering and sorting for optimal performance

###### Error Handling Strategy
- **Graceful Degradation**: Continue operation with partial failures when possible
- **Structured Responses**: Consistent error format with codes and messages
- **Comprehensive Logging**: Detailed error logging for debugging
- **User Experience**: Clear, actionable error messages for clients

###### Security Implementation
- **Authorization**: Database-level access control through query filters
- **Input Validation**: Multi-layer validation (format, business logic, constraints)
- **Access Control**: Operation-specific permission checking
- **Data Protection**: Parameterized queries preventing injection attacks

#### Migration Challenges Overcome

##### Complex Authorization Logic
- **Challenge**: Implementing sender/recipient authorization for message access
- **Solution**: Single query with OR conditions for efficient access control
- **Pattern**: `or(\`from_user_id.eq.${uid},to_user_id.eq.${uid}\`)`

##### Pagination Optimization
- **Challenge**: Efficient pagination for large message datasets
- **Solution**: Database-level pagination with separate count queries
- **Pattern**: `range(offset, offset + limit - 1)` with `head: true` count queries

##### Cross-Reference Integrity
- **Challenge**: Maintaining relationships between users, empires, and messages
- **Solution**: Atomic operations with proper foreign key relationships
- **Pattern**: Multi-table queries within single request transactions

#### Performance Considerations

##### Query Efficiency
- **Count Optimization**: Separate count queries avoid full data retrieval
- **Index Utilization**: Proper filtering ensures index usage
- **Connection Pooling**: Efficient use of Supabase connection pool
- **Response Size**: Minimal data transfer through selective queries

##### Scalability Patterns
- **Stateless Operations**: Each request independent for horizontal scaling
- **Database Optimization**: Efficient queries supporting multi-tenant architecture
- **Caching Strategy**: Response caching opportunities identified
- **Load Distribution**: Even load distribution across Supabase infrastructure

### Planned Upgrades
- **Framework Updates**: Regular updates to latest stable versions
- **Performance Improvements**: Continuous performance optimization
- **Security Enhancements**: Ongoing security improvements and patches
- **Feature Additions**: New technologies for enhanced player experience

### Scalability Planning
- **Horizontal Scaling**: Load balancing and service replication strategies
- **Database Optimization**: Advanced database performance techniques
- **Caching Layers**: Multi-level caching for improved performance
- **Global Distribution**: Multi-region deployment for reduced latency

**Last Updated**: 2025-10-08T15:05:00Z
**Document Status**: Active