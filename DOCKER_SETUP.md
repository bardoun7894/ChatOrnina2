# Docker Setup Guide for LibreChat

This guide provides instructions for running LibreChat in Docker for both local development and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose 2.0+ installed
- At least 4GB of available RAM
- Sufficient disk space (minimum 10GB recommended)

### Install Docker

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**macOS/Windows:**
Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)

## Quick Start

### 1. Clone and Configure

```bash
cd /root/LibreChat

# Copy environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

### 2. Run Local Development

```bash
docker-compose -f docker-compose.local.yml up -d
```

Access the application at: http://localhost:7000

## Local Development

### Starting the Development Environment

```bash
# Start all services
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f

# View specific service logs
docker-compose -f docker-compose.local.yml logs -f app
```

### Features of Local Setup

- **Hot Reload**: Source code changes are automatically reflected
- **Volume Mounts**: Your local files are mounted into the container
- **MongoDB**: Separate MongoDB instance for development
- **Port 7000**: Application accessible at http://localhost:7000

### Stopping Development Environment

```bash
# Stop services
docker-compose -f docker-compose.local.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.local.yml down -v
```

## Production Deployment

### 1. Prepare Environment

```bash
# Copy and configure production environment
cp .env.example .env

# Edit production variables
nano .env
```

**Important Production Variables:**
```env
NODE_ENV=production
NEXTAUTH_URL=https://www.chat.ornina.ae
NEXTAUTH_SECRET=<generate-strong-secret>
MONGODB_URI=mongodb://mongodb:27017/librechat

# API Keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_AI_API_KEY=your-google-key

# OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe (if using payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### 2. Build and Deploy

```bash
# Build production image
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 3. With Nginx (Optional)

For SSL/TLS termination and reverse proxy:

```bash
# Create nginx configuration
nano nginx.conf

# Start with nginx
docker-compose -f docker-compose.prod.yml --profile with-nginx up -d
```

**Sample nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:7000;
    }

    server {
        listen 80;
        server_name www.chat.ornina.ae;
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name www.chat.ornina.ae;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongodb:27017/librechat` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:7000` |
| `NEXTAUTH_SECRET` | Secret for NextAuth | Generate with `openssl rand -base64 32` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Application port | `7000` |

### Optional Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_AI_API_KEY` | Google AI API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate JWT secret
openssl rand -hex 64
```

## Common Commands

### Docker Compose Commands

```bash
# Start services (detached)
docker-compose -f docker-compose.local.yml up -d

# Start services (foreground with logs)
docker-compose -f docker-compose.local.yml up

# Stop services
docker-compose -f docker-compose.local.yml down

# Restart services
docker-compose -f docker-compose.local.yml restart

# View logs
docker-compose -f docker-compose.local.yml logs -f

# View specific service logs
docker-compose -f docker-compose.local.yml logs -f app

# Rebuild services
docker-compose -f docker-compose.local.yml build

# Rebuild without cache
docker-compose -f docker-compose.local.yml build --no-cache

# Remove volumes
docker-compose -f docker-compose.local.yml down -v
```

### Container Management

```bash
# List running containers
docker ps

# Execute command in container
docker exec -it librechat-app-local sh

# View container logs
docker logs librechat-app-local -f

# Inspect container
docker inspect librechat-app-local

# Stop container
docker stop librechat-app-local

# Remove container
docker rm librechat-app-local
```

### Database Management

```bash
# Access MongoDB shell
docker exec -it librechat-mongodb-local mongosh

# Backup database
docker exec librechat-mongodb-local mongodump --out /data/backup

# Restore database
docker exec librechat-mongodb-local mongorestore /data/backup
```

### Image Management

```bash
# List images
docker images

# Remove image
docker rmi librechat-app

# Prune unused images
docker image prune -a

# Build specific stage
docker build --target runner -t librechat-app .
```

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
docker-compose -f docker-compose.local.yml logs -f app
```

**Common issues:**
- Missing environment variables
- Port 7000 already in use
- Insufficient memory

**Solutions:**
```bash
# Check if port is in use
lsof -i :7000

# Free up memory
docker system prune -a

# Restart with fresh build
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml build --no-cache
docker-compose -f docker-compose.local.yml up -d
```

### MongoDB Connection Issues

**Check MongoDB status:**
```bash
docker-compose -f docker-compose.local.yml ps mongodb
docker-compose -f docker-compose.local.yml logs mongodb
```

**Test connection:**
```bash
docker exec -it librechat-mongodb-local mongosh --eval "db.adminCommand('ping')"
```

**Reset MongoDB:**
```bash
docker-compose -f docker-compose.local.yml down -v
docker volume rm librechat_mongodb_data
docker-compose -f docker-compose.local.yml up -d
```

### Build Failures

**Clear Docker cache:**
```bash
docker builder prune -a
docker-compose -f docker-compose.local.yml build --no-cache
```

**Check disk space:**
```bash
df -h
docker system df
```

### Performance Issues

**Increase Docker resources:**
- Docker Desktop → Settings → Resources
- Increase CPU and Memory allocation

**Monitor resource usage:**
```bash
docker stats
```

### Hot Reload Not Working (Development)

**Ensure volumes are mounted:**
```bash
docker-compose -f docker-compose.local.yml config
```

**Restart with fresh volumes:**
```bash
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d
```

### Health Check Failures

**Check health endpoint:**
```bash
curl http://localhost:7000/api/health
```

**View health check logs:**
```bash
docker inspect librechat-app-prod | grep -A 10 Health
```

## Production Best Practices

### 1. Security

- Use strong secrets (minimum 32 characters)
- Enable MongoDB authentication
- Use SSL/TLS certificates
- Keep Docker images updated
- Run containers as non-root user (already configured)

### 2. Monitoring

```bash
# Monitor container health
docker-compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats

# View application logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### 3. Backup Strategy

**Automated backup script:**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup MongoDB
docker exec librechat-mongodb-prod mongodump --out /data/backup_$DATE

# Backup volumes
docker run --rm -v librechat_mongodb_data:/data -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/mongodb_$DATE.tar.gz /data

echo "Backup completed: $DATE"
```

### 4. Updates and Maintenance

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Clean up old images
docker image prune -a
```

### 5. Scaling (Optional)

```bash
# Scale app service
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Use with load balancer (nginx/traefik)
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [MongoDB Docker Documentation](https://hub.docker.com/_/mongo)

## Support

For issues and questions:
- Check application logs: `docker-compose logs -f`
- Review Docker logs: `docker logs <container-name>`
- Ensure all environment variables are set correctly
- Verify Docker and Docker Compose versions

---

**Last Updated:** November 2025
