# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LibreChat is an open-source AI chat application that integrates multiple AI models and providers. It's built as a monorepo using Node.js/Express for the backend and React for the frontend, with MongoDB as the primary database.

## Development Commands

### Essential Commands

```bash
# Install dependencies (run from root)
npm install

# Build packages (required before running the app)
npm run build:packages

# Development mode
npm run frontend:dev  # Frontend on port 5173
npm run backend:dev   # Backend on port 3080

# Production build
npm run frontend      # Build frontend
npm run backend       # Run production server

# Testing
npm run test:api      # API tests
npm run test:client   # Client tests
npm run e2e           # End-to-end tests
npm run e2e:headed    # E2E tests with browser UI
```

### Docker Commands

```bash
# Using docker-compose
docker-compose up -d                  # Start all services
docker-compose down                   # Stop all services
docker-compose logs -f api           # Follow API logs

# For deployment compose
npm run start:deployed                # Start with deploy-compose.yml
npm run stop:deployed                 # Stop deployed services
```

### Database & User Management

```bash
# User management scripts
npm run create-user                   # Create a new user
npm run reset-password                # Reset user password
npm run ban-user                      # Ban a user
npm run delete-user                   # Delete a user
npm run list-users                    # List all users

# Balance management
npm run add-balance                   # Add balance to user
npm run set-balance                   # Set user balance
npm run list-balances                 # List all balances

# Database operations
npm run reset-meili-sync             # Reset Meilisearch sync
npm run flush-cache                   # Clear Redis cache
```

## Architecture Overview

### Monorepo Structure

The project uses npm workspaces with the following packages:
- `/api` - Express backend server
- `/client` - React frontend application
- `/packages/data-provider` - Data fetching and state management
- `/packages/data-schemas` - Shared TypeScript schemas and validators
- `/packages/api` - Shared API utilities
- `/packages/client` - Client utilities

### Backend Architecture

**Entry Point**: `/api/server/index.js`
- Initializes Express server with middleware
- Connects to MongoDB and sets up indexes
- Initializes AI services (CodeGen, Design, Video, Voice)
- Sets up Redis caching and cron jobs
- Configures authentication strategies

**Key Services**:
- **Authentication**: JWT, OAuth (Google, GitHub), LDAP support
- **AI Services**: Located in `/api/server/services/`
  - CodeGenService - Code generation and analysis
  - DesignAnalyzerService - Design analysis
  - VideoGenService - Video generation
  - WhisperService/TTSService - Voice services
- **Caching**: Redis-based caching layer (`/api/server/services/Cache/RedisCache.js`)
- **Rate Limiting**: Tier-based rate limiting (`/api/server/middleware/rateLimitByTier.js`)

**Database Models** (`/api/models/`):
- User, Conversation, Message - Core chat functionality
- Agent, Assistant - AI agent management
- Subscription, UsageTracking - Billing and quotas
- File, Project - File and project management

### Frontend Architecture

**Entry Point**: `/client/src/main.tsx`
- React 18 with TypeScript
- State management: Recoil + React Query
- Routing: React Router v6
- UI Components: Radix UI primitives + Tailwind CSS

**Key Features**:
- Multi-model chat interface
- Code artifacts and generative UI
- Image generation and editing
- Voice input/output
- File uploads and analysis
- Agent marketplace

### API Routes Structure

Main route groups in `/api/server/routes/`:
- `/auth` - Authentication endpoints
- `/conversations` - Chat management
- `/messages` - Message operations
- `/agents` - Agent management
- `/billing` - Subscription handling
- `/ai/*` - AI service endpoints
- `/mcp` - Model Context Protocol support

## Configuration

### Environment Variables

Create a `.env` file from `.env.example`. Critical variables:
- `MONGO_URI` - MongoDB connection string
- `DOMAIN_CLIENT/DOMAIN_SERVER` - Application URLs
- `PORT` - Server port (default: 3080)
- Provider API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)

### LibreChat Configuration

`librechat.yaml` configures:
- AI endpoints and models
- Interface customization
- Feature toggles
- Rate limits and quotas

## Testing Strategy

### Unit Tests
```bash
# Run specific test file
npm run test:api -- api/models/User.spec.js
npm run test:client -- Button.spec.tsx
```

### Integration Tests
Located in `/api/server/routes/*.test.js` and `/api/models/*.spec.js`

### E2E Tests
Playwright-based tests in `/e2e/`:
```bash
# Debug mode
npm run e2e:debug

# Generate test code
npm run e2e:codegen
```

## Database Schema

### MongoDB Collections
- `users` - User accounts and settings
- `conversations` - Chat sessions
- `messages` - Individual messages
- `agents` - Custom AI agents
- `files` - Uploaded files metadata
- `subscriptions` - User subscription data
- `usagetrackings` - Service usage tracking

### Indexes
Critical indexes are created automatically on startup via `indexSync()` in `/api/db/indexSync.js`

## Authentication Flow

1. **Local Auth**: Email/password with bcrypt hashing
2. **OAuth**: Google, GitHub via Passport.js
3. **JWT**: Token-based session management
4. **LDAP**: Enterprise directory integration

Session handling uses Redis when available, falling back to MongoDB.

## AI Provider Integration

Providers are configured in `librechat.yaml` and initialized in:
- `/api/server/services/Endpoints/` - Provider-specific implementations
- `/packages/data-schemas/src/config.ts` - Configuration schemas

Adding a new provider requires:
1. Implementation in `/api/server/services/Endpoints/`
2. Schema updates in `packages/data-schemas`
3. UI integration in `/client/src/components/Endpoints/`

## Deployment Considerations

### Production Checklist
- Set `NODE_ENV=production`
- Configure Redis for caching and sessions
- Set up MongoDB replica set for high availability
- Configure rate limiting and CORS
- Set up SSL/TLS termination
- Configure backup strategies

### Docker Deployment
The application includes multiple Docker configurations:
- `docker-compose.yml` - Development setup
- `deploy-compose.yml` - Production deployment
- Includes MongoDB, Meilisearch, pgvector, and RAG API services

### Environment-Specific Settings
- Development: Hot reload, debug logging, relaxed CORS
- Production: Minified builds, strict security, performance optimizations

## Common Development Tasks

### Adding a New Route
1. Create route handler in `/api/server/routes/`
2. Add to router index `/api/server/routes/index.js`
3. Add TypeScript types in `/packages/data-schemas/`
4. Update API client in `/packages/data-provider/`

### Modifying the UI
1. Components in `/client/src/components/`
2. Use existing design system components when possible
3. Follow React Query patterns for data fetching
4. Update translations in `/client/public/locales/`

### Working with AI Services
1. Services are in `/api/server/services/`
2. Implement quota checking via UsageTrackingService
3. Add rate limiting middleware
4. Handle errors gracefully with fallbacks

## Performance Optimizations

- Redis caching reduces database queries by ~80%
- Lazy loading for frontend routes
- Database connection pooling
- Request batching for AI services
- CDN for static assets in production

## Security Considerations

- Input sanitization via express-mongo-sanitize
- Rate limiting per tier/endpoint
- JWT token rotation
- File upload restrictions
- Content Security Policy headers
- Secrets management via environment variables