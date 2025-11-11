#!/bin/bash

# LibreChat Docker Startup Script
# This script helps you easily start LibreChat in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_info "Docker and Docker Compose are installed."
}

# Function to check environment file
check_env_file() {
    local env_file=$1
    
    if [ ! -f "$env_file" ]; then
        print_warning "Environment file $env_file not found."
        
        if [ -f ".env.example" ]; then
            print_info "Copying .env.example to $env_file"
            cp .env.example "$env_file"
            print_warning "Please edit $env_file and add your configuration."
            read -p "Press Enter to continue after editing the file..."
        else
            print_error "No .env.example file found. Please create $env_file manually."
            exit 1
        fi
    else
        print_info "Environment file $env_file found."
    fi
}

# Function to start services
start_services() {
    local compose_file=$1
    local env_file=$2
    
    print_info "Starting services with $compose_file..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$compose_file" --env-file "$env_file" up -d
    else
        docker compose -f "$compose_file" --env-file "$env_file" up -d
    fi
    
    if [ $? -eq 0 ]; then
        print_info "Services started successfully!"
    else
        print_error "Failed to start services."
        exit 1
    fi
}

# Function to show logs
show_logs() {
    local compose_file=$1
    
    print_info "Showing logs (Ctrl+C to exit)..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$compose_file" logs -f
    else
        docker compose -f "$compose_file" logs -f
    fi
}

# Function to stop services
stop_services() {
    local compose_file=$1
    
    print_info "Stopping services..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$compose_file" down
    else
        docker compose -f "$compose_file" down
    fi
    
    print_info "Services stopped."
}

# Function to show status
show_status() {
    local compose_file=$1
    
    print_info "Service status:"
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$compose_file" ps
    else
        docker compose -f "$compose_file" ps
    fi
}

# Main script
main() {
    echo "╔════════════════════════════════════════╗"
    echo "║   LibreChat Docker Manager             ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    
    # Check Docker installation
    check_docker
    
    # Parse command line arguments
    MODE=${1:-local}
    ACTION=${2:-start}
    
    case $MODE in
        local|dev|development)
            COMPOSE_FILE="docker-compose.local.yml"
            ENV_FILE=".env.local"
            print_info "Mode: Local Development"
            ;;
        prod|production)
            COMPOSE_FILE="docker-compose.prod.yml"
            ENV_FILE=".env"
            print_info "Mode: Production"
            ;;
        *)
            print_error "Invalid mode: $MODE"
            echo "Usage: $0 [local|prod] [start|stop|restart|logs|status]"
            exit 1
            ;;
    esac
    
    # Check environment file
    check_env_file "$ENV_FILE"
    
    # Execute action
    case $ACTION in
        start)
            start_services "$COMPOSE_FILE" "$ENV_FILE"
            echo ""
            print_info "Application is starting..."
            print_info "Local: http://localhost:7000"
            print_info "Health: http://localhost:7000/api/health"
            echo ""
            print_info "To view logs, run: $0 $MODE logs"
            print_info "To stop services, run: $0 $MODE stop"
            ;;
        stop)
            stop_services "$COMPOSE_FILE"
            ;;
        restart)
            stop_services "$COMPOSE_FILE"
            sleep 2
            start_services "$COMPOSE_FILE" "$ENV_FILE"
            ;;
        logs)
            show_logs "$COMPOSE_FILE"
            ;;
        status)
            show_status "$COMPOSE_FILE"
            ;;
        *)
            print_error "Invalid action: $ACTION"
            echo "Usage: $0 [local|prod] [start|stop|restart|logs|status]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
