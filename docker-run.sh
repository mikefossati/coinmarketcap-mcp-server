#!/bin/bash

# CoinMarketCap MCP Server Docker Quick Start Script
set -e

echo "🐳 CoinMarketCap MCP Server - Docker Setup"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env file and set your CMC_API_KEY before running again."
    echo "💡 Get your free API key at: https://coinmarketcap.com/api/"
    exit 1
fi

# Source environment variables
source .env

# Check if API key is set
if [ "$CMC_API_KEY" = "your_coinmarketcap_pro_api_key_here" ] || [ -z "$CMC_API_KEY" ]; then
    echo "❌ CMC_API_KEY not set in .env file"
    echo "💡 Get your free API key at: https://coinmarketcap.com/api/"
    exit 1
fi

# Parse command line arguments
COMMAND=${1:-run}
PROFILE=${2:-}

case $COMMAND in
    "build")
        echo "🔨 Building Docker image..."
        docker build -t coinmarketcap-mcp .
        echo "✅ Build complete!"
        ;;
    
    "dev")
        echo "🔧 Starting development environment..."
        docker build --target development -t coinmarketcap-mcp:dev .
        docker run -it --rm \
            -v $(pwd):/app \
            -e CMC_API_KEY="$CMC_API_KEY" \
            -e CMC_API_TIER="$CMC_API_TIER" \
            -e NODE_ENV=development \
            coinmarketcap-mcp:dev
        ;;
    
    "run")
        echo "🚀 Starting CoinMarketCap MCP Server..."
        
        # Build if image doesn't exist
        if ! docker images | grep -q coinmarketcap-mcp; then
            echo "🔨 Building Docker image first..."
            docker build -t coinmarketcap-mcp .
        fi
        
        # Run the container
        docker run -it --rm \
            -e CMC_API_KEY="$CMC_API_KEY" \
            -e CMC_API_TIER="$CMC_API_TIER" \
            -e NODE_ENV="$NODE_ENV" \
            -e CACHE_TTL_SECONDS="$CACHE_TTL_SECONDS" \
            -e DEBUG="$DEBUG" \
            coinmarketcap-mcp
        ;;
        
    "compose")
        case $PROFILE in
            "redis")
                echo "🚀 Starting with Redis caching..."
                docker-compose --profile redis up -d
                ;;
            "monitoring")
                echo "🚀 Starting with monitoring (Prometheus + Grafana)..."
                docker-compose --profile monitoring up -d
                echo "📊 Grafana: http://localhost:3001 (admin/admin123)"
                echo "📈 Prometheus: http://localhost:9090"
                ;;
            "full")
                echo "🚀 Starting full stack (Server + Redis + Monitoring)..."
                docker-compose --profile redis --profile monitoring up -d
                echo "📊 Grafana: http://localhost:3001 (admin/admin123)"
                echo "📈 Prometheus: http://localhost:9090"
                ;;
            *)
                echo "🚀 Starting basic compose setup..."
                docker-compose up -d
                ;;
        esac
        
        # Show running containers
        echo ""
        echo "📋 Running containers:"
        docker-compose ps
        ;;
        
    "logs")
        echo "📋 Showing container logs..."
        if command -v docker-compose &> /dev/null && [ -f docker-compose.yml ]; then
            docker-compose logs -f
        else
            docker logs coinmarketcap-mcp
        fi
        ;;
        
    "stop")
        echo "🛑 Stopping containers..."
        if command -v docker-compose &> /dev/null && [ -f docker-compose.yml ]; then
            docker-compose down
        else
            docker stop coinmarketcap-mcp 2>/dev/null || true
            docker rm coinmarketcap-mcp 2>/dev/null || true
        fi
        echo "✅ Stopped!"
        ;;
        
    "test")
        echo "🧪 Testing MCP Server..."
        
        # Build test image
        docker build -t coinmarketcap-mcp:test .
        
        # Run basic connectivity test
        echo "Testing basic server startup..."
        timeout 10s docker run --rm \
            -e CMC_API_KEY="$CMC_API_KEY" \
            -e CMC_API_TIER="$CMC_API_TIER" \
            coinmarketcap-mcp:test > /dev/null 2>&1 && \
        echo "✅ Server starts successfully!" || \
        echo "❌ Server startup failed!"
        ;;
        
    "clean")
        echo "🧹 Cleaning up Docker resources..."
        docker-compose down --volumes --remove-orphans 2>/dev/null || true
        docker rmi coinmarketcap-mcp coinmarketcap-mcp:dev coinmarketcap-mcp:test 2>/dev/null || true
        docker system prune -f
        echo "✅ Cleanup complete!"
        ;;
        
    "help"|*)
        echo "Usage: $0 [command] [profile]"
        echo ""
        echo "Commands:"
        echo "  build          Build the Docker image"
        echo "  run            Run the MCP server (default)"
        echo "  dev            Start development environment with volume mounting"
        echo "  compose        Start using docker-compose"
        echo "  logs           Show container logs"
        echo "  stop           Stop all containers"
        echo "  test           Test the server startup"
        echo "  clean          Clean up Docker resources"
        echo "  help           Show this help message"
        echo ""
        echo "Compose Profiles:"
        echo "  basic          Just the MCP server (default)"
        echo "  redis          MCP server + Redis caching"
        echo "  monitoring     MCP server + Prometheus + Grafana"
        echo "  full           MCP server + Redis + Monitoring"
        echo ""
        echo "Examples:"
        echo "  $0 build"
        echo "  $0 run"
        echo "  $0 dev"
        echo "  $0 compose redis"
        echo "  $0 compose monitoring"
        echo "  $0 compose full"
        echo ""
        echo "💡 Make sure to set your CMC_API_KEY in .env file first!"
        ;;
esac