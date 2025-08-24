# 🐳 Docker Guide for CoinMarketCap MCP Server

## Quick Start

### 1. Basic Docker Build and Run

```bash
# Build the Docker image
docker build -t coinmarketcap-mcp .

# Run with environment variables
docker run -e CMC_API_KEY=your_api_key_here coinmarketcap-mcp
```

### 2. Using Docker Compose

```bash
# Create environment file
cp .env.example .env
# Edit .env with your CMC_API_KEY

# Run the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required - Your CoinMarketCap API Key
CMC_API_KEY=your_coinmarketcap_api_key_here

# Optional - API Configuration
CMC_API_TIER=free
CMC_BASE_URL=https://pro-api.coinmarketcap.com

# Optional - Caching
CACHE_TTL_SECONDS=300
CACHE_MAX_KEYS=1000

# Optional - Rate Limiting  
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST_SIZE=10

# Optional - Server Configuration
NODE_ENV=production
DEBUG=false
```

### Docker Build Stages

The Dockerfile includes multiple stages:

- **`development`**: For development with hot reloading
- **`build`**: Compiles TypeScript to JavaScript
- **`production`**: Optimized runtime image (default)

```bash
# Development mode
docker build --target development -t coinmarketcap-mcp:dev .
docker run -v $(pwd):/app -e CMC_API_KEY=your_key coinmarketcap-mcp:dev

# Production mode (default)
docker build -t coinmarketcap-mcp:prod .
```

## Usage Scenarios

### Scenario 1: Claude Desktop Integration (Recommended)

For Claude Desktop, the MCP server runs as a subprocess using stdio transport:

```bash
# Build image
docker build -t coinmarketcap-mcp .

# Test the server
docker run -e CMC_API_KEY=your_key coinmarketcap-mcp
```

**Claude Desktop Configuration:**
```json
{
  "mcpServers": {
    "coinmarketcap": {
      "command": "docker",
      "args": [
        "run", "--rm",
        "-e", "CMC_API_KEY=your_api_key_here",
        "-e", "CMC_API_TIER=free",
        "coinmarketcap-mcp"
      ]
    }
  }
}
```

### Scenario 2: Standalone Service

Run as a persistent Docker service:

```bash
# Using docker-compose
docker-compose up -d coinmarketcap-mcp-server

# Or directly with docker
docker run -d \\
  --name coinmarketcap-mcp \\
  --restart unless-stopped \\
  -e CMC_API_KEY=your_key \\
  -v ./logs:/app/logs \\
  coinmarketcap-mcp
```

### Scenario 3: Development Environment

```bash
# Start development container
docker-compose --profile development up -d

# Or build and run development image
docker build --target development -t coinmarketcap-mcp:dev .
docker run -it \\
  -v $(pwd):/app \\
  -e CMC_API_KEY=your_key \\
  coinmarketcap-mcp:dev
```

## Advanced Features

### With Redis Caching

```bash
# Start with Redis for distributed caching
docker-compose --profile redis up -d

# This starts both the MCP server and Redis
```

### With Monitoring

```bash
# Start with Prometheus and Grafana monitoring
docker-compose --profile monitoring up -d

# Access Grafana at http://localhost:3001
# Username: admin, Password: admin123
```

### Full Stack

```bash
# Start everything (server + redis + monitoring)
docker-compose --profile redis --profile monitoring up -d
```

## Docker Commands Reference

```bash
# Build commands
docker build -t coinmarketcap-mcp .
docker build --target development -t coinmarketcap-mcp:dev .

# Run commands
docker run --rm -e CMC_API_KEY=your_key coinmarketcap-mcp
docker run -d --name mcp-server -e CMC_API_KEY=your_key coinmarketcap-mcp

# Docker Compose commands
docker-compose up -d                    # Start services
docker-compose down                     # Stop services
docker-compose logs -f                  # View logs
docker-compose ps                       # List services
docker-compose restart                  # Restart services

# Management commands
docker logs coinmarketcap-mcp           # View container logs
docker exec -it coinmarketcap-mcp sh    # Access container shell
docker system prune                     # Clean up unused containers/images
```

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   ```
   Error: CMC_API_KEY environment variable is required
   ```
   Solution: Set your CoinMarketCap API key in environment variables

2. **Permission Denied**
   ```
   Error: EACCES: permission denied
   ```
   Solution: Ensure proper volume mounting permissions

3. **Container Won't Start**
   ```bash
   # Check container logs
   docker logs coinmarketcap-mcp
   
   # Run interactively to debug
   docker run -it --rm -e CMC_API_KEY=your_key coinmarketcap-mcp sh
   ```

### Health Checks

The container includes built-in health checks:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' coinmarketcap-mcp

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' coinmarketcap-mcp
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use .env files** for local development
3. **Use secrets management** in production
4. **Run as non-root user** (already configured in Dockerfile)
5. **Keep base images updated** regularly

## Performance Optimization

1. **Use multi-stage builds** (already implemented)
2. **Minimize image layers**
3. **Use .dockerignore** to exclude unnecessary files
4. **Enable caching** for better performance
5. **Use Alpine Linux** base image for smaller size

## Production Deployment

For production deployment, consider:

- Using Docker Swarm or Kubernetes
- Implementing proper logging and monitoring
- Setting up health checks and restart policies
- Using external Redis for caching
- Implementing proper secrets management
- Setting up reverse proxy (nginx/traefik)

Example production docker-compose override:

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  coinmarketcap-mcp-server:
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Run with: `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d`