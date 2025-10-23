# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LibreChat is an open-source AI chat application that integrates multiple AI models and providers. It's built as a monorepo using Node.js/Express for the backend and React for the frontend, with MongoDB as the primary database.

## Development Commands

### Essential Commands

```bash
# Install dependencies (run from root)
npm install

# Build packages (REQUIRED before running the app or after schema changes)
npm run build:packages

# Development mode (requires separate terminals)
npm run frontend:dev  # Frontend on port 5173
npm run backend:dev   # Backend on port 3080

# Production build
npm run frontend      # Build frontend (includes package builds)
npm run backend       # Run production server

# Build individual packages (when making changes)
npm run build:data-provider      # Data fetching/state management
npm run build:data-schemas       # Shared TypeScript schemas
npm run build:api                # Shared API utilities
npm run build:client-package     # Client utilities

# Testing
npm run test:api      # API tests
npm run test:client   # Client tests
npm run e2e           # End-to-end tests
npm run e2e:headed    # E2E tests with browser UI
npm run e2e:debug     # Debug E2E tests
npm run e2e:codegen   # Generate E2E test code
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

**Key Services** (in `/api/server/services/`):
- **Authentication**: JWT, OAuth (Google, GitHub) - Local email/password auth
- **AI Services**:
  - `Code/CodeGenService.js` - Code generation and analysis
  - `Design/DesignAnalyzerService.js` - Design analysis
  - `VideoGenService.js` - Video generation
  - `WhisperService.js` / `TTSService.js` - Voice services
- **Billing**: `Billing/StripeService.js` - Subscription and payment processing
- **Caching**: `Cache/RedisCache.js` - Redis-based caching layer (5-min TTL for dashboard data)
- **Rate Limiting**: Tier-based rate limiting via `middleware/rateLimitByTier.js`
  - Free: 20 req/min, Basic: 60 req/min, Pro: 200 req/min, Enterprise: 1000 req/min
- **Usage Tracking**: `Cron/usageReset.js` - Monthly quota resets (1st of each month)
- **MCP Integration**: `MCP.js` - Model Context Protocol support

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
# Run all API tests
npm run test:api

# Run all client tests
npm run test:client

# Run specific test file
npm run test:api -- api/models/User.spec.js
npm run test:client -- Button.spec.tsx

# Watch mode for development
cd api && npm run test
cd client && npm run test
```

### Integration Tests
- Located in `/api/server/routes/*.test.js` (route tests)
- Located in `/api/models/*.spec.js` (model tests)
- Examples: `subscription.test.js`, `usageTracking.test.js`

### E2E Tests
Playwright-based tests in `/e2e/`:
```bash
# Run E2E tests
npm run e2e

# With browser UI
npm run e2e:headed

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

**Supported Methods**:
1. **Local Auth**: Email/password with bcrypt hashing
2. **OAuth**: Google, GitHub via Passport.js
3. **JWT**: Token-based session management

**Important Notes**:
- Session handling uses Redis when available, falling back to MongoDB
- LDAP, SAML, Firebase Auth, Apple/Discord/Facebook OAuth have been removed in recent optimizations
- Authentication strategies are in `/api/strategies/`: `localStrategy.js`, `googleStrategy.js`, `githubStrategy.js`, `jwtStrategy.js`

## AI Provider Integration

**Active Providers** (optimized - excessive providers removed):
- OpenAI (`/api/server/services/Endpoints/openAI/`)
- Anthropic (`/api/server/services/Endpoints/anthropic/`)
- Google (`/api/server/services/Endpoints/google/`)
- Azure OpenAI and Assistants (`/api/server/services/Endpoints/azureAssistants/`)
- Custom Endpoints (`/api/server/services/Endpoints/custom/`)

**Provider Configuration**:
- Configured in `librechat.yaml`
- Provider enums in `/packages/data-provider/src/schemas.ts` (EModelEndpoint, Providers)
- Provider mapping in `/api/server/services/Endpoints/index.js` (`providerConfigMap`)

**Adding a New Provider**:
1. Create provider implementation in `/api/server/services/Endpoints/<provider>/initialize.js`
2. Add to `providerConfigMap` in `Endpoints/index.js`
3. Update provider enums in `/packages/data-provider/src/schemas.ts`
4. Rebuild packages: `npm run build:data-provider && npm run build:data-schemas`
5. Add UI components in `/client/src/components/Endpoints/`

**Removed Providers** (as of optimization):
- Bedrock, Ollama, DeepSeek, OpenRouter, XAI, Mistral - removed to reduce app size

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

### Adding a New API Route
1. Create route handler in `/api/server/routes/` (e.g., `myFeature.js`)
2. Register route in `/api/server/routes/index.js`
3. Add TypeScript types in `/packages/data-schemas/src/types/`
4. Export types from `/packages/data-schemas/src/index.ts`
5. Update API client in `/packages/data-provider/src/data-service.ts`
6. **Rebuild packages**: `npm run build:packages`

### Modifying Shared Types/Schemas
1. Update types in `/packages/data-provider/src/types/` or `/packages/data-schemas/`
2. **Always rebuild packages after changes**: `npm run build:packages`
3. Restart both frontend and backend dev servers

### Working with UI Components
1. Components in `/client/src/components/`
2. Use Radix UI primitives + Tailwind CSS
3. Follow React Query patterns for data fetching (via `/packages/data-provider/`)
4. Add translations to `/client/public/locales/<lang>/translation.json`
5. State management: Recoil atoms in `/client/src/store/`

### Working with AI Services
1. Create service in `/api/server/services/` (see existing services as templates)
2. Implement quota checking via `UsageTrackingService`
3. Add tier-based rate limiting middleware
4. Initialize service in `/api/server/index.js` on startup
5. Handle errors gracefully with try-catch and fallbacks

## Performance Optimizations

- Redis caching reduces database queries by ~80%
- Lazy loading for frontend routes
- Database connection pooling
- Request batching for AI services
- CDN for static assets in production

## Security Considerations

- Input sanitization via express-mongo-sanitize
- Tier-based rate limiting per endpoint (via `rateLimitByTier.js` middleware)
- JWT token-based authentication with secure session handling
- File upload restrictions (size limits, type validation)
- Content Security Policy headers
- Secrets management via environment variables (never commit .env)
- Bcrypt password hashing for local authentication
- HTTPS enforcement in production

## Tools & Integrations

**Available Tools** (optimized set):
- **DALL-E 3**: Image generation via OpenAI (`/api/app/clients/tools/structured/DALLE3.js`)
- **Google Search**: Web search integration (`/api/app/clients/tools/structured/GoogleSearch.js`)
- Tool manifest: `/api/app/clients/tools/manifest.json`

**Removed Tools** (as of optimization):
- Wolfram, OpenWeather, YouTube, Traversaal, Tavily, Azure AI Search, Stable Diffusion

## File Storage Options

Supported file storage backends (via `/api/server/services/Files/`):
- **Local**: Local filesystem storage
- **S3**: AWS S3 bucket storage
- **Azure**: Azure Blob Storage
- **OpenAI**: OpenAI file storage (for assistants/agents)

Configuration via environment variables in `.env`

## Subscription & Billing

**Stripe Integration** (`/api/server/services/Billing/StripeService.js`):
- Subscription tiers: Free, Basic, Pro, Enterprise
- Usage tracking per user via `UsageTracking` model
- Monthly quota resets (automated via cron job)
- Payment webhooks for subscription events

**Endpoints**:
- `/api/billing/*` - Subscription management routes
- Dashboard data cached for 5 minutes (Redis)