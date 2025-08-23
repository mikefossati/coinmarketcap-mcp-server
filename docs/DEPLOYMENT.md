# Deployment Guide

This guide covers various deployment options for the CoinMarketCap MCP Server.

## Local Development

### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd coinmarketcap-mcp-server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your CMC API key

# Run in development mode
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

## Claude Desktop Integration

### 1. Build the Server
```bash
npm run build
```

### 2. Configure Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "coinmarketcap": {
      "command": "node",
      "args": ["/absolute/path/to/coinmarketcap-mcp-server/dist/index.js"],
      "env": {
        "CMC_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

The server will be available for use with Claude.

## Docker Deployment

### Basic Docker Setup

1. **Build the Image**
```bash
docker build -t coinmarketcap-mcp .
```

2. **Run the Container**
```bash
docker run -d \
  --name coinmarketcap-mcp \
  -e CMC_API_KEY=your_api_key_here \
  -p 3000:3000 \
  coinmarketcap-mcp
```

### Docker Compose (Recommended)

1. **Create .env file**
```bash
cp .env.example .env
# Edit with your settings
```

2. **Start Services**
```bash
# Basic setup
docker-compose up -d

# With Redis caching
docker-compose --profile redis up -d

# With monitoring (Prometheus + Grafana)
docker-compose --profile monitoring up -d

# Full stack
docker-compose --profile redis --profile monitoring up -d
```

3. **View Logs**
```bash
docker-compose logs -f coinmarketcap-mcp-server
```

## Cloud Deployment

### AWS EC2

1. **Launch EC2 Instance**
   - Choose Amazon Linux 2 or Ubuntu 20.04+
   - Instance type: t3.micro or larger
   - Security group: Allow inbound on port 3000

2. **Setup Server**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup project
git clone <repository-url>
cd coinmarketcap-mcp-server
npm install
npm run build

# Configure environment
sudo nano /etc/environment
# Add: CMC_API_KEY=your_api_key_here

# Install PM2 for process management
sudo npm install -g pm2
```

3. **Start with PM2**
```bash
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Google Cloud Platform

1. **Create VM Instance**
```bash
gcloud compute instances create coinmarketcap-mcp \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server
```

2. **Setup Firewall**
```bash
gcloud compute firewall-rules create allow-mcp-server \
  --allow tcp:3000 \
  --source-ranges 0.0.0.0/0 \
  --target-tags http-server
```

3. **Deploy Application** (same as EC2 steps)

### Heroku

1. **Create Heroku App**
```bash
heroku create your-app-name
```

2. **Set Environment Variables**
```bash
heroku config:set CMC_API_KEY=your_api_key_here
heroku config:set NODE_ENV=production
```

3. **Deploy**
```bash
git push heroku main
```

4. **Scale**
```bash
heroku ps:scale web=1
```

## Kubernetes Deployment

### 1. Create Kubernetes Manifests

**deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coinmarketcap-mcp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: coinmarketcap-mcp
  template:
    metadata:
      labels:
        app: coinmarketcap-mcp
    spec:
      containers:
      - name: coinmarketcap-mcp
        image: coinmarketcap-mcp:latest
        ports:
        - containerPort: 3000
        env:
        - name: CMC_API_KEY
          valueFrom:
            secretKeyRef:
              name: coinmarketcap-secret
              key: api-key
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: coinmarketcap-mcp-service
spec:
  selector:
    app: coinmarketcap-mcp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

**secret.yaml**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: coinmarketcap-secret
type: Opaque
data:
  api-key: <base64-encoded-api-key>
```

### 2. Deploy to Kubernetes
```bash
# Create secret
kubectl apply -f secret.yaml

# Deploy application
kubectl apply -f deployment.yaml

# Check status
kubectl get pods
kubectl get services
```

## Process Management

### PM2 Configuration

**ecosystem.config.js**
```javascript
module.exports = {
  apps: [{
    name: 'coinmarketcap-mcp',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '200M',
    node_args: '--max-old-space-size=200'
  }]
};
```

### Systemd Service

**coinmarketcap-mcp.service**
```ini
[Unit]
Description=CoinMarketCap MCP Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/coinmarketcap-mcp-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=CMC_API_KEY=your_api_key_here

[Install]
WantedBy=multi-user.target
```

```bash
# Install service
sudo cp coinmarketcap-mcp.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable coinmarketcap-mcp
sudo systemctl start coinmarketcap-mcp

# Check status
sudo systemctl status coinmarketcap-mcp
```

## Monitoring and Logging

### Health Checks
```bash
# Basic health check
curl http://localhost:3000/health

# Server info via MCP
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_server_info","arguments":{}}}' \
  | node dist/index.js
```

### Log Management
```bash
# View logs with PM2
pm2 logs coinmarketcap-mcp

# Follow logs with Docker
docker-compose logs -f coinmarketcap-mcp-server

# Systemd logs
sudo journalctl -u coinmarketcap-mcp -f
```

### Monitoring with Prometheus

The included monitoring stack provides:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Node Exporter**: System metrics

Access Grafana at `http://localhost:3001` (admin/admin123)

## Performance Optimization

### Scaling Recommendations

**Single Instance:**
- t3.micro (1 vCPU, 1GB RAM) - Up to 50 req/min
- t3.small (2 vCPU, 2GB RAM) - Up to 200 req/min

**Load Balanced:**
- Multiple instances behind load balancer
- Shared Redis cache for consistency
- Auto-scaling based on CPU/memory

### Caching Strategy
```javascript
// High-frequency data (prices): 1 minute TTL
// Market metrics: 5 minutes TTL  
// Historical data: 1 hour TTL
// Technical analysis: 10 minutes TTL
```

### Database Optimization
- Consider PostgreSQL for persistent historical data
- Use Redis for hot cache data
- Implement cache warming for popular queries

## Security

### API Key Management
- Use environment variables or secrets management
- Rotate API keys regularly
- Monitor API usage and set alerts

### Network Security
- Use HTTPS in production
- Implement rate limiting
- Set up firewall rules
- Use VPC/private networks in cloud deployments

### Container Security
```bash
# Run security scan
docker scan coinmarketcap-mcp

# Use non-root user (already configured)
# Keep base image updated
# Scan for vulnerabilities regularly
```

## Troubleshooting

### Common Issues

1. **API Rate Limits**
   - Check current usage: Use `get_rate_limit_status` tool
   - Increase cache TTL to reduce API calls
   - Upgrade CoinMarketCap plan if needed

2. **Memory Issues**
   - Monitor cache size with `get_cache_stats`
   - Reduce CACHE_MAX_KEYS if needed
   - Consider Redis for distributed caching

3. **Connection Issues**
   - Verify CMC_API_KEY is correct
   - Check network connectivity
   - Validate SSL certificates

### Debug Mode
```bash
# Enable debug logging
export DEBUG=coinmarketcap-mcp:*
npm start

# Or with PM2
pm2 start ecosystem.config.js --env development
```

### Support Resources
- [MCP Documentation](https://modelcontextprotocol.io/docs)
- [CoinMarketCap API Docs](https://coinmarketcap.com/api/documentation/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## Backup and Recovery

### Configuration Backup
- Store environment variables securely
- Version control all configuration files
- Document custom settings and modifications

### Data Backup
- Cache data is ephemeral (no backup needed)
- Log rotation and archival
- Monitor disk space usage

## Upgrade Process

1. **Test in Development**
   ```bash
   git pull origin main
   npm install
   npm run build
   npm test
   ```

2. **Deploy with Zero Downtime**
   ```bash
   # PM2
   pm2 reload coinmarketcap-mcp
   
   # Docker
   docker-compose pull
   docker-compose up -d
   
   # Kubernetes
   kubectl set image deployment/coinmarketcap-mcp coinmarketcap-mcp=coinmarketcap-mcp:new-version
   ```

3. **Verify Deployment**
   - Check health endpoints
   - Verify API functionality
   - Monitor error logs
   - Test with Claude Desktop