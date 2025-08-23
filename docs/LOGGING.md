# Comprehensive Logging Guide

The CoinMarketCap MCP Server includes detailed logging for debugging, monitoring, and troubleshooting.

## 📊 **Logging Features**

### **HTTP Request/Response Logging**
- ✅ **HTTP Status Codes**: 200, 401, 403, 429, 500, etc.
- ✅ **Request Duration**: Millisecond timing for performance monitoring
- ✅ **Data Size**: Response payload sizes
- ✅ **Rate Limiting**: Current usage and remaining requests
- ✅ **API Credits**: CoinMarketCap credit consumption tracking
- ✅ **Error Details**: Full error context with troubleshooting suggestions

### **Tool Execution Logging** 
- ✅ **Request IDs**: Unique identifiers for tracing requests
- ✅ **Execution Time**: Performance timing for each tool
- ✅ **Input Parameters**: Logged parameter keys (values hidden for privacy)
- ✅ **Result Size**: Response data sizes
- ✅ **Error Context**: Detailed error information with suggestions

### **Cache Performance Logging**
- ✅ **Cache Hits/Misses**: Performance metrics
- ✅ **Data Sizes**: Memory usage tracking
- ✅ **TTL Information**: Cache expiration times
- ✅ **Key Management**: Cache key lifecycle events

### **Server Lifecycle Logging**
- ✅ **Startup Information**: Environment, versions, configuration
- ✅ **Tool Registration**: Available tools by category
- ✅ **Performance Metrics**: Memory usage, uptime, system info

## 🔧 **Log Levels & Configuration**

### **Environment Variables**
```bash
# Set log level (error, warn, info, debug)
LOG_LEVEL=info

# Enable debug logging (shows all internal operations)
DEBUG=coinmarketcap-mcp:*

# Disable colors in output
NO_COLOR=1

# Development vs Production
NODE_ENV=development  # Shows debug info and stack traces
NODE_ENV=production   # Production-optimized logging
```

### **Log Levels**
1. **ERROR**: Critical failures, API errors, authentication issues
2. **WARN**: Rate limits, retries, non-critical issues  
3. **INFO**: Normal operations, successful requests, tool executions
4. **DEBUG**: Detailed internal operations, cache operations, request details

## 📋 **Sample Log Output**

### **Server Startup**
```
[2025-08-23T14:02:16.088Z] INFO: Initializing CoinMarketCap API Client {
  "baseURL": "https://pro-api.coinmarketcap.com",
  "maxRequestsPerMinute": 100,
  "timeout": "10s",
  "apiKeyConfigured": true
}

[2025-08-23T14:02:16.090Z] INFO: Starting CoinMarketCap MCP Server...

[2025-08-23T14:02:16.090Z] INFO: Environment: {
  "nodeEnv": "development",
  "nodeVersion": "v18.17.0",
  "platform": "darwin",
  "memoryUsage": {
    "rss": 45678592,
    "heapTotal": 18874368,
    "heapUsed": 12345678
  }
}

[2025-08-23T14:02:16.095Z] INFO: Server configuration: {
  "totalTools": 23,
  "cacheEnabled": true,
  "rateLimitingEnabled": true,
  "apiProvider": "CoinMarketCap Pro",
  "transport": "stdio"
}
```

### **Successful API Request**
```
[2025-08-23T14:02:20.123Z] DEBUG: API Request Starting {
  "requestId": "abc123",
  "method": "GET",
  "url": "/v1/cryptocurrency/quotes/latest",
  "params": ["symbol", "convert"],
  "requestCount": 5,
  "remainingRequests": 95
}

[2025-08-23T14:02:20.456Z] INFO: API Request Successful {
  "requestId": "abc123",
  "status": 200,
  "statusText": "OK",
  "duration": "333ms",
  "url": "/v1/cryptocurrency/quotes/latest",
  "dataSize": 2048,
  "creditsUsed": 1,
  "remainingCredits": "999"
}
```

### **Tool Execution**
```
[2025-08-23T14:02:20.100Z] INFO: Tool execution started {
  "requestId": "def456",
  "toolName": "get_crypto_price",
  "argsProvided": true,
  "argKeys": ["symbol", "convert"]
}

[2025-08-23T14:02:20.500Z] INFO: Tool execution completed successfully {
  "requestId": "def456", 
  "toolName": "get_crypto_price",
  "duration": "400ms",
  "resultSize": "1024 bytes",
  "resultType": "object",
  "hasData": true
}
```

### **Cache Operations**
```
[2025-08-23T14:02:19.500Z] DEBUG: Cache miss: crypto_price:{"symbol":"BTC","convert":"USD"}

[2025-08-23T14:02:20.500Z] INFO: Cache set: crypto_price:{"symbol":"BTC","convert":"USD"} (TTL: 60s, Size: 1024 bytes)

[2025-08-23T14:02:25.600Z] INFO: Cache hit: crypto_price:{"symbol":"BTC","convert":"USD"}
```

### **Error Handling**
```
[2025-08-23T14:02:30.123Z] ERROR: CMC API Error Response {
  "requestId": "ghi789",
  "duration": "200ms",
  "url": "/v1/cryptocurrency/quotes/latest",
  "status": 401,
  "statusText": "Unauthorized",
  "cmcErrorCode": 1001,
  "cmcErrorMessage": "API key missing",
  "fullResponse": {...}
}

[2025-08-23T14:02:30.124Z] ERROR: Authentication Failed - Check API Key {
  "requestId": "ghi789"
}

[2025-08-23T14:02:30.125Z] ERROR: Tool execution failed {
  "requestId": "ghi789",
  "toolName": "get_crypto_price", 
  "duration": "250ms",
  "errorType": "Error",
  "errorMessage": "CMC API Error 1001: API key missing"
}
```

### **Rate Limiting**
```
[2025-08-23T14:02:45.000Z] WARN: Rate Limit Warning {
  "current": 95,
  "max": 100,
  "remaining": 5,
  "resetTime": "2025-08-23T14:03:00.000Z"
}

[2025-08-23T14:02:50.000Z] ERROR: Rate limit exceeded {
  "currentRequests": 100,
  "maxRequests": 100,
  "waitTimeSeconds": 10,
  "resetTime": "2025-08-23T14:03:00.000Z"
}
```

## 🔍 **Troubleshooting with Logs**

### **Common Error Patterns**

#### **1. Authentication Issues**
```
ERROR: Authentication Failed - Check API Key
```
**Solution**: Verify `CMC_API_KEY` in environment variables

#### **2. Rate Limiting**
```  
WARN: Rate Limit Exceeded
ERROR: Rate limit exceeded. Please wait 45 seconds.
```
**Solution**: Wait for reset time or upgrade CoinMarketCap plan

#### **3. Network Connectivity**
```
ERROR: Network Error - No Response Received
```
**Solution**: Check internet connection and CMC API status

#### **4. Invalid Parameters**
```
ERROR: CMC API Error 400: Invalid value for "symbol"
```
**Solution**: Check tool parameter format and valid values

#### **5. API Plan Limits**
```
ERROR: Payment Required - API Plan Limit Reached
```
**Solution**: Upgrade CoinMarketCap plan or wait for monthly reset

### **Performance Monitoring**

#### **Response Time Analysis**
Look for duration patterns in logs:
- **< 200ms**: Cached responses (optimal)
- **200-500ms**: Real-time API calls (normal)
- **> 2000ms**: Potential issues (investigate)

#### **Cache Effectiveness**
Monitor cache hit/miss ratios:
```bash
# Count cache hits vs misses
grep "Cache hit" logs.txt | wc -l
grep "Cache miss" logs.txt | wc -l
```

#### **API Usage Tracking**
Monitor credit consumption:
```bash
# Track API credits used
grep "creditsUsed" logs.txt | grep -o '"creditsUsed": [0-9]*'
```

## 📈 **Log Analysis Tools**

### **Real-time Monitoring**
```bash
# Follow logs in real-time
tail -f logs/combined.log

# Filter by log level  
tail -f logs/combined.log | grep "ERROR"

# Monitor specific operations
tail -f logs/combined.log | grep "API Request"
```

### **Performance Analysis**
```bash
# Find slow requests (>1 second)
grep -E "duration.*[0-9]{4,}ms" logs/combined.log

# Cache performance
grep -c "Cache hit" logs/combined.log
grep -c "Cache miss" logs/combined.log

# API usage patterns
grep "API Request Successful" logs/combined.log | grep -o '"duration": "[0-9]*ms"' | sort
```

### **Error Analysis**
```bash
# Count error types
grep "ERROR:" logs/combined.log | cut -d':' -f3 | sort | uniq -c

# Rate limiting incidents
grep "Rate limit exceeded" logs/combined.log | wc -l

# Authentication failures
grep "Authentication Failed" logs/combined.log
```

## 🛠 **Log Management**

### **Log Rotation** (for production)
```bash
# Using logrotate (recommended)
# /etc/logrotate.d/coinmarketcap-mcp
/path/to/logs/*.log {
  daily
  missingok
  rotate 30
  compress
  delaycompress
  copytruncate
  notifempty
}
```

### **Structured Logging Integration**
For production environments, consider integrating with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana + Loki** for visualization
- **Datadog** or **New Relic** for APM
- **Sentry** for error tracking

### **Log Storage Recommendations**
- **Development**: Console output with file rotation
- **Production**: Centralized logging with retention policies
- **Monitoring**: Real-time alerting on ERROR level logs

## 📊 **Metrics Dashboard Example**

Using the logs, you can create dashboards tracking:
- **Request Volume**: API calls per minute/hour
- **Response Times**: P50, P95, P99 percentiles  
- **Error Rates**: Percentage of failed requests
- **Cache Performance**: Hit ratios and memory usage
- **Rate Limit Usage**: Remaining capacity tracking
- **Tool Popularity**: Most used analysis tools

## 🚨 **Alerting Setup**

Set up alerts for:
- **High Error Rates**: >5% failed requests
- **Slow Responses**: >2s average response time
- **Rate Limit Approaching**: >90% usage
- **Authentication Failures**: Any 401 errors
- **Service Unavailable**: Any 500+ errors

---

**The comprehensive logging ensures you can monitor, debug, and optimize the CoinMarketCap MCP Server effectively in any environment.**