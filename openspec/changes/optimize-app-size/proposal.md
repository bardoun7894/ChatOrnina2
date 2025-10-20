## Why
Optimize LibreChat application size and performance by removing excessive features not required by the SaaS platform specification, while maintaining core functionality for Arabic/English chat, AI image/video generation, and subscription billing.

## What Changes
- **BREAKING**: Remove excessive AI provider integrations (keep only OpenAI, Anthropic, Google)
- **BREAKING**: Remove excessive tool integrations (keep only DALL-E and Google Search)
- **BREAKING**: Simplify authentication methods (keep only Email/Password, Google, GitHub)
- **BREAKING**: Replace full code execution environment with Monaco Editor
- **BREAKING**: Remove Firebase integration and excessive real-time features
- **BREAKING**: Optimize Azure usage (keep only OpenAI and Assistants)
- Update package.json to remove heavy dependencies
- Reduce application size by ~67% (from 1.8GB to ~600MB)
- Reduce frontend bundle size by ~70% (from 17MB to ~5MB)

## Impact
- Affected specs: ai-providers, tools, authentication, code-execution, real-time, azure-services
- Affected code: api/, client/, package.json, environment configuration
- Migration required: Update user configurations, API endpoints, and dependencies
- Performance improvement: Faster loading, reduced memory usage, simplified maintenance


