# Claude Desktop Setup Guide

Complete step-by-step guide to integrate the CoinMarketCap MCP Server with Claude Desktop.

## 🚀 **Quick Setup (5 minutes)**

### **1. Install and Build the Server**

```bash
# Clone the repository
git clone <repository-url>
cd coinmarketcap-mcp-server

# Install dependencies
npm install

# Configure for your API tier
cp .env.example .env
# Edit .env with your settings:
# CMC_API_KEY=your_api_key_here
# CMC_API_TIER=free  # or startup/standard/professional

# Build the project
npm run build

# Test the server
npm test
```

### **2. Find Your Node.js Path**

```bash
# Find your node executable path
which node
# Example output: /opt/homebrew/bin/node
```

### **3. Configure Claude Desktop**

**Location of config file:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Create or update the config:**
```json
{
  "mcpServers": {
    "coinmarketcap": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/FULL/PATH/TO/coinmarketcap-mcp-server/dist/index.js"],
      "env": {
        "CMC_API_KEY": "your_api_key_here",
        "CMC_API_TIER": "free"
      }
    }
  }
}
```

**⚠️ IMPORTANT**: 
- Use **full absolute paths** - no `~` or relative paths
- Replace `/FULL/PATH/TO/` with your actual project path
- Update the node path to match your `which node` output

### **4. Restart Claude Desktop**

1. **Completely quit Claude Desktop** (Cmd+Q on Mac, Alt+F4 on Windows)
2. **Restart Claude Desktop**
3. **Wait for connection** (may take 10-15 seconds on first start)

### **5. Test the Integration**

Ask Claude Desktop:
```
"What's the current price of Bitcoin?"
```

Expected response: Real-time Bitcoin price data with market information.

## 🔍 **Troubleshooting**

### **Common Issues & Solutions**

#### **"Server failed to start"**

**Problem**: Wrong node path or file permissions
**Solution**:
```bash
# Check node path
which node

# Make file executable
chmod +x /path/to/coinmarketcap-mcp-server/dist/index.js

# Test server manually
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
```

#### **"No tools available"**

**Problem**: Configuration file not found or malformed JSON
**Solution**:
```bash
# Validate JSON configuration
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .

# Check if config file exists
ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

#### **"Connection timeout"**

**Problem**: Server takes too long to start or crashes immediately
**Solution**:
```bash
# Check server logs
CMC_API_KEY="your_key" CMC_API_TIER="free" node dist/index.js 2>&1 | head -20

# Check for missing dependencies
npm install

# Rebuild if necessary
npm run build
```

#### **"Tool requires paid plan"**

**Problem**: Trying to use premium tools with free tier
**Solution**: Set `CMC_API_TIER=free` in your config to hide premium tools.

### **Advanced Troubleshooting**

#### **Enable Debug Mode**
```json
{
  "mcpServers": {
    "coinmarketcap": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/path/to/coinmarketcap-mcp-server/dist/index.js"],
      "env": {
        "CMC_API_KEY": "your_api_key_here",
        "CMC_API_TIER": "free",
        "NODE_ENV": "development",
        "DEBUG": "coinmarketcap-mcp:*"
      }
    }
  }
}
```

#### **Test API Connection**
```bash
# Test your API key works
curl -H "X-CMC_PRO_API_KEY: your_api_key_here" \
  "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=BTC"
```

#### **Check Tool Status**
Once connected, ask Claude:
```
"Show me my API tier status"
```
This will show available tools, tier limits, and configuration.

## 📋 **Configuration Examples**

### **Free Tier (Most Common)**
```json
{
  "mcpServers": {
    "coinmarketcap": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/Users/yourname/coinmarketcap-mcp-server/dist/index.js"],
      "env": {
        "CMC_API_KEY": "your_free_api_key",
        "CMC_API_TIER": "free",
        "CACHE_TTL_SECONDS": "600",
        "RATE_LIMIT_REQUESTS_PER_MINUTE": "30"
      }
    }
  }
}
```

### **Paid Tier (Full Features)**
```json
{
  "mcpServers": {
    "coinmarketcap": {
      "command": "/opt/homebrew/bin/node", 
      "args": ["/Users/yourname/coinmarketcap-mcp-server/dist/index.js"],
      "env": {
        "CMC_API_KEY": "your_paid_api_key",
        "CMC_API_TIER": "startup",
        "CACHE_TTL_SECONDS": "300",
        "RATE_LIMIT_REQUESTS_PER_MINUTE": "100"
      }
    }
  }
}
```

### **Development/Debug Mode**
```json
{
  "mcpServers": {
    "coinmarketcap": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/Users/yourname/coinmarketcap-mcp-server/dist/index.js"],
      "env": {
        "CMC_API_KEY": "your_api_key",
        "CMC_API_TIER": "free",
        "NODE_ENV": "development",
        "DEBUG": "coinmarketcap-mcp:*",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

## ✅ **Verification Steps**

After setup, verify everything works:

1. **Check server connection:**
   ```
   "Are you connected to the CoinMarketCap server?"
   ```

2. **Test basic functionality:**
   ```
   "What's the current price of Bitcoin?"
   ```

3. **Check available tools:**
   ```
   "What CoinMarketCap tools are available?"
   ```

4. **Verify tier configuration:**
   ```
   "Show me my API tier status"
   ```

## 🎯 **Expected Results**

### **Free Tier Success**
- ✅ 7 tools available (price data, market overview, dominance)
- ✅ Real-time Bitcoin/Ethereum prices work
- ✅ Market overview and top cryptocurrencies work
- ❌ Technical analysis tools are hidden (as expected)

### **Paid Tier Success**
- ✅ 18 tools available (all features)
- ✅ Technical indicators and historical data work
- ✅ Trading signals and risk metrics work
- ✅ All advanced analytics available

---

**🎉 Once working, you'll have a powerful crypto analysis assistant integrated directly into Claude Desktop!**

## 📞 **Getting Help**

If you're still having issues:
1. Check the main [troubleshooting guide](../README.md#troubleshooting)
2. Review the [logging documentation](LOGGING.md) for debug information
3. Test with the [integration test suite](TESTING.md)
4. Open an issue with your configuration and error logs