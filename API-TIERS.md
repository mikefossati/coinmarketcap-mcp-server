# CoinMarketCap API Tier Configuration

This guide explains how to configure the CoinMarketCap MCP Server to work with different CoinMarketCap API tiers, especially the free tier.

## 🆓 **Free Tier Configuration (Recommended for Personal Use)**

If you're using the free tier CoinMarketCap API key, configure the server to avoid calls to premium-only endpoints:

### Quick Setup

1. **Set API Tier in Environment**
   ```bash
   # In your .env file
   CMC_API_TIER=free
   ```

2. **Restart the Server**
   ```bash
   npm run build && npm start
   ```

### What Changes with Free Tier

#### ✅ **Available Tools (7 tools)**
- `get_crypto_price` - Real-time cryptocurrency prices
- `get_multiple_prices` - Batch price queries  
- `get_top_cryptocurrencies` - Top cryptocurrencies by market cap
- `search_cryptocurrencies` - Search cryptocurrencies by name/symbol
- `get_market_overview` - Global market overview and metrics
- `get_market_dominance` - Bitcoin/Ethereum dominance analysis
- `analyze_altcoin_season` - Altcoin season detection (using free tier data)

#### ❌ **Unavailable Tools (11 tools)**
- `get_trending_cryptocurrencies` - Requires trending data endpoint
- `get_gainers_losers` - Requires trending data endpoint
- `calculate_technical_indicators` - Requires historical data
- `analyze_price_action` - Requires historical data
- `generate_trading_signals` - Requires historical data
- `compare_technical_strength` - Requires historical data
- `get_historical_data` - Requires historical OHLCV endpoint
- `analyze_price_performance` - Requires historical quotes endpoint
- `compare_historical_performance` - Requires historical quotes endpoint
- `analyze_market_cycles` - Requires historical OHLCV endpoint
- `calculate_risk_metrics` - Requires historical quotes endpoint

#### 🚫 **Blocked Features**
- Historical price data (OHLCV)
- Technical indicators (RSI, MACD, Bollinger Bands, etc.)
- Risk metrics and portfolio analysis
- Trending cryptocurrencies data
- Advanced analytics and predictions

## 📊 **Check Your Current Configuration**

Use the `get_api_tier_status` tool to check your current setup:

```bash
# Test via command line
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_api_tier_status", "arguments": {}}}' | node dist/index.js
```

Or ask Claude: "What's my current API tier status?"

## 💡 **Free Tier Limitations**

The CoinMarketCap free tier includes:
- **10,000 API calls per month**
- **9 market data endpoints**
- **Personal use only** (no commercial usage)
- **No historical data access**
- **Basic price and market data only**

## 🚀 **Upgrading Your Plan**

### Startup Plan ($79/month)
```bash
# In your .env file  
CMC_API_TIER=startup
```
- **1,000,000 calls/month**
- **14 endpoints** (includes historical data)
- **All 18 MCP tools available**
- **Technical analysis features**
- **Risk metrics and portfolio analysis**

### Standard Plan ($333/month)
```bash
CMC_API_TIER=standard
```
- **Higher rate limits**
- **All 22 CoinMarketCap endpoints**
- **Commercial usage rights**

### Professional & Enterprise Plans
```bash
CMC_API_TIER=professional
# or
CMC_API_TIER=enterprise
```
- **Custom rate limits**
- **Priority support**
- **Advanced features**

## ⚙️ **Configuration Options**

### Environment Variables

```bash
# API Tier (required for free tier users)
CMC_API_TIER=free

# Your CoinMarketCap API Key
CMC_API_KEY=your_actual_api_key_here

# Optional: Adjust rate limits for your tier
RATE_LIMIT_REQUESTS_PER_MINUTE=30  # Conservative for free tier
RATE_LIMIT_REQUESTS_PER_MINUTE=100 # Default for paid tiers

# Optional: Optimize cache for your usage
CACHE_TTL_SECONDS=600  # Longer cache for free tier (saves API calls)
CACHE_TTL_SECONDS=300  # Shorter cache for paid tiers (fresher data)
```

### Claude Desktop Configuration

Update your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "coinmarketcap": {
      "command": "node",
      "args": ["/path/to/coinmarketcap-mcp-server/dist/index.js"],
      "env": {
        "CMC_API_KEY": "your_api_key_here",
        "CMC_API_TIER": "free"
      }
    }
  }
}
```

## 🔧 **Error Prevention**

With proper tier configuration, you'll avoid these common errors:
- ❌ `Error 1006: Your API Key subscription plan doesn't support this endpoint`
- ❌ `Rate limit exceeded` (reduced by smart caching)
- ❌ `Insufficient data for calculation` (tools auto-disabled)

## 📋 **Integration Testing**

Test your configuration:

```bash
# Run integration tests with tier restrictions
CMC_API_TIER=free node test-integration.js
```

Expected results for free tier:
- ✅ **8/13 tests pass** (basic features work)
- ❌ **5/13 tests blocked** (premium features properly disabled)
- 🎯 **No API errors** (only tier restriction messages)

## 💡 **Cost Optimization Tips**

### For Free Tier Users
1. **Enable longer caching**: `CACHE_TTL_SECONDS=600`
2. **Use batch requests**: `get_multiple_prices` instead of multiple `get_crypto_price` calls
3. **Monitor usage**: Use `get_rate_limit_status` tool regularly
4. **Focus on basic analysis**: Market overview, dominance, price tracking

### For Paid Tier Users  
1. **Set correct tier**: `CMC_API_TIER=startup` (or higher)
2. **Use all features**: Technical indicators, historical analysis, risk metrics
3. **Shorter cache**: `CACHE_TTL_SECONDS=300` for fresher data
4. **Monitor usage**: Track API credits with `get_rate_limit_status`

## 🎯 **Best Practices**

### Free Tier Strategy
```bash
# Example queries that work well on free tier
"What's the current price of Bitcoin and Ethereum?"
"Show me the top 10 cryptocurrencies by market cap"
"What's the current crypto market overview?"
"What's Bitcoin's market dominance today?"
"Are we in altcoin season based on current market data?"
```

### Paid Tier Strategy
```bash
# Example queries that require paid tier
"Calculate RSI and MACD for Bitcoin"
"Show me Bitcoin's price performance over the last 90 days"
"Generate trading signals for Ethereum"
"What are the risk metrics for my crypto portfolio?"
"Compare technical strength between top 10 altcoins"
```

## 🆘 **Troubleshooting**

### Tool Not Available Error
```
Error: This tool requires a paid CoinMarketCap API plan
```
**Solution**: Either upgrade your plan or use available free tier tools.

### API Endpoint Error 1006
```
Error: Your API Key subscription plan doesn't support this endpoint
```
**Solution**: Set `CMC_API_TIER=free` to prevent calls to premium endpoints.

### Rate Limit Issues
**Solution**: 
- Free tier: Increase cache TTL, use batch requests
- Paid tier: Check if you need to upgrade for higher limits

---

**🎯 Bottom Line**: Set `CMC_API_TIER=free` in your `.env` file to make the server work perfectly with the free CoinMarketCap API tier, giving you reliable cryptocurrency analysis without API errors.