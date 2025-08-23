# CoinMarketCap MCP Server Documentation

This directory contains comprehensive documentation for the CoinMarketCap MCP Server.

## 📚 **Documentation Index**

### **[API Tier Configuration](API-TIERS.md)**
Complete guide to configuring the server for different CoinMarketCap API plans:
- Free tier setup and limitations
- Paid tier configuration and benefits
- Tool availability by tier
- Cost optimization strategies
- Troubleshooting tier-specific issues

### **[Comprehensive Logging](LOGGING.md)**
Detailed logging system documentation:
- Log levels and configuration
- HTTP request/response monitoring
- Performance metrics and analysis
- Error tracking and troubleshooting
- Production monitoring best practices

### **[Testing Guide](TESTING.md)**
Testing strategies and debugging:
- Unit tests and integration tests
- API tier testing scenarios
- Claude Desktop integration testing
- Performance testing and benchmarking
- Troubleshooting common test failures

### **[Claude Desktop Setup](CLAUDE-DESKTOP-SETUP.md)**
Step-by-step Claude Desktop integration:
- Complete setup instructions
- Configuration examples for all tiers
- Troubleshooting connection issues
- Verification and testing steps

### **[Deployment Guide](DEPLOYMENT.md)**
Production deployment instructions:
- Docker containerization
- Kubernetes deployment
- Environment configuration for production
- Monitoring and scaling considerations
- CI/CD pipeline setup

## 🚀 **Quick Reference**

### **Common Configuration Tasks**

**Set up free tier:**
```bash
CMC_API_TIER=free
```

**Enable debug logging:**
```bash
NODE_ENV=development
DEBUG=coinmarketcap-mcp:*
```

**Optimize for production:**
```bash
NODE_ENV=production
CACHE_TTL_SECONDS=300
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

### **Essential Tools**

**Check your API tier status:**
```bash
get_api_tier_status
```

**Monitor API usage:**
```bash
get_rate_limit_status
```

**Check cache performance:**
```bash
get_cache_stats
```

### **Troubleshooting Quick Fixes**

| Issue | Solution | Documentation |
|-------|----------|---------------|
| Premium tool blocked | Set `CMC_API_TIER=free` | [API Tiers Guide](API-TIERS.md) |
| Claude Desktop won't connect | Use full node path in config | [Testing Guide](TESTING.md) |
| API errors | Check logs with `DEBUG=*` | [Logging Guide](LOGGING.md) |
| Rate limiting | Increase cache TTL | [API Tiers Guide](API-TIERS.md) |

## 🔧 **Development Resources**

### **Project Structure**
```
coinmarketcap-mcp-server/
├── src/
│   ├── api/          # API client and caching
│   ├── tools/        # MCP tool implementations  
│   ├── config/       # API tier configuration
│   ├── utils/        # Utilities and validators
│   └── types/        # TypeScript type definitions
├── docs/             # This documentation
├── tests/            # Test files
└── dist/             # Compiled JavaScript
```

### **Key Files**
- `src/config/api-tiers.ts` - API tier management system
- `src/api/client.ts` - CoinMarketCap API client with logging
- `src/index.ts` - Main MCP server implementation
- `.env.example` - Environment configuration template

### **Build and Development**
```bash
# Development
npm run dev

# Production build  
npm run build

# Run tests
npm test
npm run test:integration

# Linting
npm run lint
```

---

For general usage instructions, see the main [README.md](../README.md) in the project root.