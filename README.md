# AI SaaS Platform

A comprehensive AI-powered SaaS platform with ChatGPT-like capabilities, supporting Arabic and English languages.

## Features

- **Multi-language Chat**: Advanced AI chat with support for Arabic and English languages
- **AI Image Generation**: Generate stunning images with AI using DALL-E integration
- **AI Video Generation**: Create videos from text or templates with AI assistance
- **Code Generation**: Generate code in multiple programming languages with AI
- **Design Analysis**: Analyze designs and convert them to prompts with AI
- **User Dashboard**: Manage all tools and view usage statistics
- **Subscription System**: Flexible subscription plans for individuals and businesses
- **Admin Panel**: User management and analytics for administrators

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB
- **Authentication**: NextAuth.js with Email/Password, Google, GitHub
- **AI Providers**: OpenAI (GPT-4, DALL-E), Anthropic (Claude), Google (Gemini)
- **Internationalization**: next-i18next for Arabic/English support

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB database
- API keys for AI providers (OpenAI, Anthropic, Google)
- OAuth credentials for Google and GitHub

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ai-saas-platform.git
   cd ai-saas-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration values.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/librechat

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# AI Providers
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Azure (Optional)
AZURE_OPENAI_API_KEY=your-azure-openai-key
AZURE_OPENAI_ENDPOINT=your-azure-openai-endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name

# Payment
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# File Upload
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=10485760

# App Settings
NODE_ENV=development
PORT=3000
```

## Project Structure

```
/src
  /components          # React components
    /ChatBot         # Chat interface components
    /Dashboard        # Dashboard components
    /ImageGenerator   # Image generation components
    /VideoGenerator   # Video generation components
    /CodeGenerator    # Code generation components
    /DesignAnalyzer   # Design analysis components
    /Subscription     # Subscription components
    /MonacoEditor    # Code editor component
    /Auth            # Authentication components
    /Admin           # Admin panel components
  /pages              # Next.js pages
    /api            # API routes
      /ai           # AI-related endpoints
      /auth          # Authentication endpoints
      /payment       # Payment endpoints
  /services           # Service layer for API calls
    /openai.ts     # OpenAI service
    /anthropic.ts  # Anthropic service
    /google.ts      # Google AI service
  /utils              # Utility functions
  /locales            # Translation files
    /ar            # Arabic translations
    /en            # English translations
  /styles             # Global styles
```

## API Endpoints

### Authentication

- `POST /api/auth/signin` - Sign in with credentials
- `POST /api/auth/signup` - Create a new account
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signout` - Sign out

### AI Services

- `POST /api/ai/chat` - Generate chat response
- `POST /api/ai/image` - Generate image with DALL-E
- `POST /api/ai/video` - Generate video
- `POST /api/ai/code` - Generate code
- `POST /api/ai/design` - Analyze design

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Docker Deployment

```bash
docker build -t ai-saas-platform .
docker run -p 3000:3000 ai-saas-platform
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please contact support@ai-saas-platform.com or open an issue on GitHub.



