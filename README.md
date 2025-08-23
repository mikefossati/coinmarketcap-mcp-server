# CoinMarketCap MCP Server

A comprehensive Model Context Protocol (MCP) server for real-time cryptocurrency analysis and market intelligence, powered by the CoinMarketCap Pro API.

## Features

### 🚀 **Real-time Data**
- Live cryptocurrency prices and market data
- Market capitalization and volume tracking
- Real-time market dominance metrics
- Trending cryptocurrencies analysis

### 📊 **Technical Analysis**
- **Technical Indicators**: RSI, MACD, Moving Averages (SMA/EMA), Bollinger Bands
- **Price Action Analysis**: Support/resistance levels, trend analysis
- **Trading Signals**: Buy/sell/hold signals with confidence scores
- **Multi-asset Comparison**: Compare technical strength across cryptocurrencies

### 📈 **Market Intelligence**
- **Market Overview**: Global crypto market metrics and sentiment
- **Altcoin Season Analysis**: Detect and predict altcoin season cycles
- **Top Gainers/Losers**: Real-time performance leaders
- **Market Dominance**: BTC/ETH dominance tracking and analysis

### 📋 **Historical Analysis**
- **Historical Data**: OHLCV data with comprehensive analysis
- **Performance Metrics**: Returns, volatility, Sharpe ratios
- **Risk Analysis**: VaR, drawdowns, correlation analysis
- **Market Cycles**: Seasonal patterns and cycle identification

### ⚡ **Performance Optimized**
- **Intelligent Caching**: Sub-second response times for frequent queries
- **Rate Limiting**: Built-in API rate limit management
- **Batch Processing**: Efficient multi-asset analysis

### 📊 **Production-Ready Logging**
- **Comprehensive Logging**: HTTP status codes, response times, error details
- **Request Tracing**: Unique request IDs for debugging
- **Performance Monitoring**: API usage, cache hit rates, execution times
- **Error Analysis**: Detailed error context with troubleshooting suggestions

## Installation

### Prerequisites
- Node.js 18+ 
- CoinMarketCap Pro API key ([Get one here](https://coinmarketcap.com/api/))

### Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd coinmarketcap-mcp-server
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# CoinMarketCap API Configuration
CMC_API_KEY=your_coinmarketcap_pro_api_key_here
CMC_BASE_URL=https://pro-api.coinmarketcap.com

# Server Configuration
PORT=3000
NODE_ENV=production

# Cache Configuration (optional)
CACHE_TTL_SECONDS=300
CACHE_MAX_KEYS=1000

# Rate Limiting (optional)
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

3. **Build and Run**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Usage with Claude

### MCP Configuration

Add to your Claude configuration file (claude_desktop_config.json):

```json
{
  "mcpServers": {
    "coinmarketcap": {
      "command": "node",
      "args": ["/path/to/coinmarketcap-mcp-server/dist/index.js"],
      "env": {
        "CMC_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Example Queries

Once configured, you can ask Claude:

**Price Analysis:**
- "What's the current price of Bitcoin and Ethereum?"
- "Get me the top 20 cryptocurrencies by market cap"
- "Compare the performance of SOL, ADA, and DOT over the last 30 days"

**Technical Analysis:**
- "Calculate RSI and MACD for Bitcoin"
- "Generate trading signals for Ethereum with moderate strategy"
- "Compare technical strength between top 10 altcoins"

**Market Intelligence:**
- "Give me a comprehensive crypto market overview"
- "Are we in altcoin season? Analyze the probability"
- "What are the top gainers and losers today?"

**Historical Analysis:**
- "Analyze Bitcoin's price performance over the last year"
- "Calculate risk metrics for Ethereum vs Bitcoin"
- "Show me the historical correlation between BTC and ETH"

## Available Tools

### Price Data Tools
- `get_crypto_price` - Real-time price for any cryptocurrency
- `get_multiple_prices` - Batch price queries for multiple coins
- `get_top_cryptocurrencies` - Top cryptocurrencies by market cap
- `search_cryptocurrencies` - Search cryptocurrencies by name/symbol

### Market Analysis Tools  
- `get_market_overview` - Comprehensive market overview
- `get_market_dominance` - BTC/ETH dominance analysis
- `analyze_altcoin_season` - Altcoin season detection and analysis
- `get_trending_cryptocurrencies` - Currently trending coins
- `get_gainers_losers` - Top gainers and losers

### Technical Analysis Tools
- `calculate_technical_indicators` - RSI, MACD, moving averages, Bollinger Bands
- `analyze_price_action` - Price patterns and trend analysis
- `generate_trading_signals` - Buy/sell/hold signals with confidence scores
- `compare_technical_strength` - Multi-asset technical comparison

### Historical Analysis Tools
- `get_historical_data` - Historical OHLCV data with analysis
- `analyze_price_performance` - Performance metrics across time periods
- `compare_historical_performance` - Multi-asset performance comparison
- `analyze_market_cycles` - Market cycle and seasonality analysis
- `calculate_risk_metrics` - VaR, Sharpe ratios, risk-adjusted returns

### Server Management Tools
- `get_server_info` - Server capabilities and status
- `get_cache_stats` - Cache performance metrics
- `get_rate_limit_status` - API usage and rate limit status

## API Coverage

This MCP server provides access to over **10,000 cryptocurrencies** with:

- **Real-time Data**: Prices, market caps, volumes, changes
- **Market Metrics**: Global market data, dominance, trends
- **Historical Data**: Up to 10 years of historical OHLCV data
- **Technical Indicators**: Professional-grade technical analysis
- **Risk Analytics**: Comprehensive risk and performance metrics

## Performance

### Response Times
- **Cached Queries**: <200ms
- **Real-time Data**: <500ms  
- **Complex Analysis**: <2s

### Cache Efficiency
- **Hit Rate**: >85% for frequent data
- **TTL**: 5 minutes for prices, 15 minutes for analysis
- **Memory Usage**: Optimized for 1000+ cached items

### Rate Limits
- **Default**: 100 requests/minute
- **Burst Protection**: Built-in request queuing
- **Auto-throttling**: Prevents API limit violations

## Error Handling

The server includes comprehensive error handling:

- **API Errors**: Graceful handling of CoinMarketCap API issues
- **Rate Limits**: Automatic retry with exponential backoff
- **Data Validation**: Input sanitization and validation
- **Caching Errors**: Fallback to fresh API calls
- **Network Issues**: Retry mechanisms and timeout handling

## Development

### Project Structure
```
src/
├── api/               # API client and utilities
│   ├── client.ts      # CoinMarketCap API client
│   ├── cache.ts       # Caching layer
│   └── rate-limiter.ts # Rate limiting
├── tools/             # MCP tool implementations
│   ├── price-data.ts     # Price and market data tools
│   ├── market-metrics.ts # Market analysis tools  
│   ├── technical.ts      # Technical analysis tools
│   └── historical.ts     # Historical analysis tools
├── utils/             # Utilities
│   ├── validators.ts  # Input validation
│   └── formatters.ts  # Data formatting
├── types/             # TypeScript type definitions
└── index.ts           # Main server implementation
```

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Pricing & Costs

### CoinMarketCap API Costs
- **Basic Plan**: $149/month - 10,000 calls/month
- **Professional Plan**: $333/month - 100,000 calls/month  
- **Enterprise**: Custom pricing for higher volumes

### Optimization Tips
- Use caching to reduce API calls (built-in)
- Batch requests when analyzing multiple assets
- Choose appropriate cache TTL for your use case
- Monitor API usage with built-in rate limit tools

## Debugging & Monitoring

### **Enhanced Logging**
The server includes comprehensive logging for debugging and monitoring:

```bash
# Enable debug logging
export DEBUG=coinmarketcap-mcp:*
export LOG_LEVEL=debug
node dist/index.js

# Monitor logs in real-time
tail -f logs/combined.log

# Filter specific operations
tail -f logs/combined.log | grep "API Request"
```

**Log Features:**
- **HTTP Status Codes**: 200, 401, 403, 429, 500 with full context
- **Response Times**: Millisecond timing for performance analysis
- **Request IDs**: Unique identifiers for tracing requests
- **Cache Performance**: Hit/miss ratios and memory usage
- **Error Details**: Full error context with suggestions

See [LOGGING.md](LOGGING.md) for complete logging documentation.

## Troubleshooting

### Common Issues

**"CMC_API_KEY environment variable is required"**
- Ensure your .env file contains a valid CoinMarketCap Pro API key
- Check logs: `grep "Authentication Failed" logs/combined.log`

**"Rate limit exceeded"**  
- Increase RATE_LIMIT_REQUESTS_PER_MINUTE or upgrade your CMC plan
- Check current usage with `get_rate_limit_status` tool
- Monitor usage: `grep "Rate Limit" logs/combined.log`

**"Insufficient data for calculation"**
- Some technical indicators require minimum data points
- Try a longer timeframe for historical analysis
- Check error details in logs for specific requirements

**Cache performance issues**
- Check cache stats with `get_cache_stats` tool
- Adjust CACHE_TTL_SECONDS and CACHE_MAX_KEYS as needed
- Monitor cache performance: `grep "Cache" logs/combined.log`

### Debug Mode
```bash
# Enable comprehensive debugging
export NODE_ENV=development
export DEBUG=coinmarketcap-mcp:*
export LOG_LEVEL=debug
```

### Support

For issues and support:
- Check the [logging guide](LOGGING.md) for debugging
- Review [testing guide](TESTING.md) for verification
- Review [deployment guide](DEPLOYMENT.md) for setup issues
- Open an issue on GitHub with relevant log excerpts

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built for professional cryptocurrency analysis and market intelligence. Designed to transform how you analyze crypto markets with Claude.**