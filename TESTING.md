# Testing Guide

This guide provides comprehensive testing methods for the CoinMarketCap MCP Server.

## 🏃 **Quick Test (2 minutes)**

### 1. Basic Server Test
```bash
npm run test:server
```

**Expected Output:**
```
✅ Server builds and starts correctly
✅ MCP protocol communication works  
✅ All tools are properly registered
```

### 2. Check Available Tools
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

Should list all 20+ available tools.

## 🔧 **Full Integration Test (5 minutes)**

### Prerequisites
1. **Get CoinMarketCap Pro API Key**
   - Visit: https://coinmarketcap.com/api/
   - Sign up for Basic plan ($149/month) or Professional ($333/month)
   - Copy your API key

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add: CMC_API_KEY=your_actual_api_key_here
   ```

### Run Integration Tests
```bash
npm run test:integration
```

**Expected Output:**
```
📊 Basic Price Data
   🧪 Bitcoin Price...
     ✅ Success
        Symbol: BTC
        Price: $43,250

📊 Market Analysis  
   🧪 Market Overview...
     ✅ Success
        Total Market Cap: $2.1T

📊 Technical Analysis
   🧪 Bitcoin Technical Indicators...
     ✅ Success
        Indicators: rsi, sma

🎉 All tests passed! Server is ready for production.
```

## 🤖 **Claude Desktop Integration Test**

### 1. Configure Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

### 2. Test with Claude

Restart Claude Desktop, then try these test queries:

#### **Basic Price Query**
```
What's the current price of Bitcoin?
```

**Expected**: Real-time BTC price with market data

#### **Market Analysis**
```
Give me a comprehensive crypto market overview
```

**Expected**: Market cap, dominance, trending coins, top gainers/losers

#### **Technical Analysis**
```
Calculate technical indicators for Ethereum and generate trading signals
```

**Expected**: RSI, MACD, moving averages, buy/sell/hold signals

#### **Advanced Analysis**
```
Compare the risk metrics between Bitcoin, Ethereum, and Solana over the last 90 days
```

**Expected**: Volatility, Sharpe ratios, correlations, VaR calculations

#### **Altcoin Season Analysis**
```
Are we in altcoin season? Give me the full probability analysis
```

**Expected**: BTC dominance trends, altcoin performance metrics, probability scores

## 🐳 **Docker Testing**

### 1. Build and Run
```bash
docker build -t coinmarketcap-mcp .
docker run -e CMC_API_KEY=your_key_here -p 3000:3000 coinmarketcap-mcp
```

### 2. Test Container
```bash
docker exec -it <container_id> node -e "console.log('MCP Server running')"
```

## 🔍 **Manual API Testing**

### Direct MCP Protocol Testing
```bash
# Test server info
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_server_info","arguments":{}}}' | node dist/index.js

# Test Bitcoin price
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_crypto_price","arguments":{"symbol":"BTC"}}}' | node dist/index.js

# Test market overview
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_market_overview","arguments":{}}}' | node dist/index.js
```

## 🚨 **Troubleshooting Tests**

### Common Issues

**1. "CMC_API_KEY environment variable is required"**
```bash
# Solution: Configure API key
cp .env.example .env
# Edit .env with your API key
```

**2. "Rate limit exceeded"**
```bash
# Solution: Wait 1 minute or upgrade CMC plan
# Check current usage:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_rate_limit_status","arguments":{}}}' | node dist/index.js
```

**3. "Server not responding"**
```bash
# Check if server builds correctly
npm run build

# Check for port conflicts  
lsof -i :3000
```

**4. "Invalid API key"**
```bash
# Verify API key at CoinMarketCap dashboard
curl -H "X-CMC_PRO_API_KEY: your_key" "https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest"
```

**5. "Tools not available in Claude"**
```bash
# Check Claude config file exists and has correct path
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Restart Claude Desktop after config changes
```

### Debug Mode
```bash
# Enable detailed logging
export DEBUG=coinmarketcap-mcp:*
node dist/index.js
```

### Performance Testing
```bash
# Test response times
time echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_crypto_price","arguments":{"symbol":"BTC"}}}' | node dist/index.js

# Should be <500ms for first call, <200ms for cached calls
```

## 📊 **Load Testing**

### Concurrent Requests Test
```bash
# Test multiple simultaneous requests
for i in {1..10}; do
  echo '{"jsonrpc":"2.0","id":'$i',"method":"tools/call","params":{"name":"get_crypto_price","arguments":{"symbol":"BTC"}}}' | node dist/index.js &
done
wait
```

### Cache Performance Test
```bash
# Test cache hit rates
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_cache_stats","arguments":{}}}' | node dist/index.js
```

## ✅ **Test Success Criteria**

### ✅ **Basic Tests Pass If:**
- Server builds without errors
- MCP protocol responds correctly
- All 20+ tools are registered
- No critical errors in logs

### ✅ **Integration Tests Pass If:**
- API key authentication works
- Real-time data returns successfully
- Technical indicators calculate correctly
- Historical analysis completes
- Rate limiting functions properly

### ✅ **Claude Integration Works If:**
- Claude recognizes the MCP server
- Tools appear in Claude's capabilities
- Queries return structured responses
- Complex analysis requests work
- Performance is <2s for complex queries

## 🎯 **Expected Performance Benchmarks**

- **Basic price queries**: <200ms (cached), <500ms (fresh)
- **Market overview**: <1s
- **Technical analysis**: <2s  
- **Historical analysis**: <3s
- **Cache hit rate**: >85%
- **API rate limit**: 100 req/min (default CMC plan)

## 📋 **Production Readiness Checklist**

- [ ] All tests pass
- [ ] API key configured securely
- [ ] Environment variables set
- [ ] Claude Desktop integration working
- [ ] Performance meets benchmarks
- [ ] Error handling tested
- [ ] Rate limits understood
- [ ] Monitoring configured (optional)

---

**🎉 Once all tests pass, your CoinMarketCap MCP Server is ready for professional cryptocurrency analysis with Claude!**