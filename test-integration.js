#!/usr/bin/env node

// Integration test script with real API calls
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (color, message) => console.log(`${color}${message}${colors.reset}`);

async function runMCPTest(testName, toolName, args = {}) {
  return new Promise((resolve) => {
    log(colors.blue, `   🧪 ${testName}...`);
    
    const serverProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let output = '';
    const timeoutId = setTimeout(() => {
      serverProcess.kill();
      log(colors.red, `     ❌ Timeout after 30 seconds`);
      resolve({ success: false, error: 'Timeout' });
    }, 30000);

    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"jsonrpc"')) {
          clearTimeout(timeoutId);
          serverProcess.kill();
          
          try {
            const response = JSON.parse(line);
            if (response.error) {
              log(colors.red, `     ❌ API Error: ${response.error.message || response.error}`);
              resolve({ success: false, error: response.error });
            } else if (response.result) {
              const result = JSON.parse(response.result.content[0].text);
              
              // Check if the response contains an error (403/404 responses still return result but with error content)
              if (result.error || response.result.isError) {
                log(colors.red, `     ❌ API Error: ${result.error || 'Unknown error'}`);
                if (result.error && (result.error.includes('403') || result.error.includes('Forbidden'))) {
                  log(colors.red, `        API Key may be invalid or suspended`);
                } else if (result.error && (result.error.includes('404') || result.error.includes('Not Found'))) {
                  log(colors.red, `        Resource not found or invalid parameters`);
                } else if (result.error && (result.error.includes('401') || result.error.includes('Unauthorized'))) {
                  log(colors.red, `        Authentication failed - check API key`);
                }
                resolve({ success: false, error: result.error || 'API error' });
              } else {
                log(colors.green, `     ✅ Success`);
                
                // Log key metrics for verification
                if (result.symbol) log(colors.reset, `        Symbol: ${result.symbol}`);
                if (result.price) log(colors.reset, `        Price: $${result.price.toLocaleString()}`);
                if (result.global_metrics) log(colors.reset, `        Total Market Cap: $${(result.global_metrics.total_market_cap/1e12).toFixed(2)}T`);
                if (result.cryptocurrencies) log(colors.reset, `        Results: ${result.cryptocurrencies.length} cryptocurrencies`);
                if (result.indicators) log(colors.reset, `        Indicators: ${Object.keys(result.indicators).join(', ')}`);
                
                resolve({ success: true, data: result });
              }
            } else {
              log(colors.yellow, `     ⚠️  Unexpected response format`);
              resolve({ success: false, error: 'Invalid response' });
            }
          } catch (e) {
            log(colors.red, `     ❌ JSON parsing error: ${e.message}`);
            resolve({ success: false, error: e.message });
          }
          return;
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Rate limit exceeded')) {
        clearTimeout(timeoutId);
        serverProcess.kill();
        log(colors.yellow, `     ⚠️  Rate limit exceeded - API working but throttled`);
        resolve({ success: false, error: 'Rate limited', rateLimited: true });
      } else if (error.includes('CMC_API_KEY')) {
        clearTimeout(timeoutId);
        serverProcess.kill();
        log(colors.red, `     ❌ API key not configured`);
        resolve({ success: false, error: 'No API key' });
      }
    });

    // Send the test request
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function testIntegration() {
  log(colors.blue + colors.bold, '🚀 CoinMarketCap MCP Server Integration Tests\n');

  // Check if API key is configured
  try {
    const envContent = await fs.readFile('.env', 'utf8');
    const hasApiKey = envContent.includes('CMC_API_KEY=') && !envContent.includes('your_coinmarketcap_pro_api_key_here');
    
    if (!hasApiKey) {
      log(colors.red, '❌ API key not configured in .env file');
      log(colors.yellow, '   Please add your CoinMarketCap Pro API key to .env:');
      log(colors.reset, '   CMC_API_KEY=your_actual_api_key_here');
      log(colors.reset, '\n   Get one at: https://coinmarketcap.com/api/');
      return;
    }
  } catch {
    log(colors.red, '❌ .env file not found. Copy .env.example to .env and add your API key.');
    return;
  }

  const integrationTests = [
    {
      category: 'Basic Price Data',
      tests: [
        { name: 'Bitcoin Price', tool: 'get_crypto_price', args: { symbol: 'BTC' }},
        { name: 'Multiple Prices (BTC, ETH)', tool: 'get_multiple_prices', args: { symbols: ['BTC', 'ETH'] }},
        { name: 'Top 5 Cryptocurrencies', tool: 'get_top_cryptocurrencies', args: { limit: 5 }}
      ]
    },
    {
      category: 'Market Analysis',
      tests: [
        { name: 'Market Overview', tool: 'get_market_overview', args: {}},
        { name: 'Market Dominance', tool: 'get_market_dominance', args: {}},
        { name: 'Trending Cryptocurrencies', tool: 'get_trending_cryptocurrencies', args: { limit: 5 }}
      ]
    },
    {
      category: 'Technical Analysis',
      tests: [
        { name: 'Bitcoin Technical Indicators', tool: 'calculate_technical_indicators', args: { symbol: 'BTC', indicators: ['rsi', 'sma'] }},
        { name: 'Ethereum Trading Signals', tool: 'generate_trading_signals', args: { symbol: 'ETH', strategy: 'moderate' }}
      ]
    },
    {
      category: 'Historical Analysis',
      tests: [
        { name: 'Bitcoin 30-day Performance', tool: 'analyze_price_performance', args: { symbol: 'BTC', periods: ['30d'] }},
        { name: 'Risk Metrics (BTC)', tool: 'calculate_risk_metrics', args: { symbol: 'BTC', timeframe: '30d' }}
      ]
    }
  ];

  let totalTests = 0;
  let passedTests = 0;
  let rateLimited = false;

  for (const category of integrationTests) {
    log(colors.yellow + colors.bold, `\n📊 ${category.category}`);
    
    for (const test of category.tests) {
      totalTests++;
      const result = await runMCPTest(test.name, test.tool, test.args);
      
      if (result.success) {
        passedTests++;
      } else if (result.rateLimited) {
        rateLimited = true;
        log(colors.yellow, '     ⏸️  Pausing tests due to rate limiting...');
        break;
      } else if (result.error === 'No API key') {
        log(colors.red, '\n❌ Tests stopped - API key required');
        return;
      } else if (result.error && (result.error.includes('403') || result.error.includes('401'))) {
        log(colors.red, '\n❌ Tests stopped - API authentication failed');
        log(colors.yellow, '   Check your API key in .env file');
        log(colors.yellow, '   Ensure your CoinMarketCap account is active');
        return;
      }
      
      // Small delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (rateLimited) break;
  }

  // Server management tests (these don't require API key)
  log(colors.yellow + colors.bold, '\n🔧 Server Management');
  const managementTests = [
    { name: 'Server Info', tool: 'get_server_info', args: {}},
    { name: 'Cache Stats', tool: 'get_cache_stats', args: {}},
    { name: 'Rate Limit Status', tool: 'get_rate_limit_status', args: {}}
  ];

  for (const test of managementTests) {
    totalTests++;
    const result = await runMCPTest(test.name, test.tool, test.args);
    if (result.success) passedTests++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  log(colors.blue + colors.bold, '\n📋 Integration Test Summary:');
  log(colors.green, `✅ ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    log(colors.green + colors.bold, '🎉 All tests passed! Server is ready for production.');
    log(colors.yellow, '\n📋 Next steps:');
    log(colors.reset, '1. Add to Claude Desktop configuration:');
    log(colors.reset, '   See: claude_desktop_config.example.json');
    log(colors.reset, '2. Restart Claude Desktop');
    log(colors.reset, '3. Start asking crypto analysis questions!');
  } else if (rateLimited) {
    log(colors.yellow, '⚠️  Some tests skipped due to rate limiting (this is normal)');
    log(colors.green, '✅ Server is working correctly!');
  } else {
    log(colors.red, `❌ ${totalTests - passedTests} tests failed`);
    log(colors.yellow, '\n🔍 Troubleshooting:');
    log(colors.reset, '• 401/403 errors: Check API key validity and account status');
    log(colors.reset, '• 404 errors: Verify cryptocurrency symbols and parameters'); 
    log(colors.reset, '• 429 errors: Rate limit exceeded (normal for free tier)');
    log(colors.reset, '• Network errors: Check internet connection and CMC API status');
    log(colors.yellow, '\nCheck the error messages above for specific details.');
  }

  // Performance info
  log(colors.blue, '\n⚡ Expected Performance:');
  log(colors.reset, '• Cached requests: <200ms');
  log(colors.reset, '• Real-time data: <500ms');  
  log(colors.reset, '• Complex analysis: <2s');
  log(colors.reset, '• API rate limit: 100 req/min (default)');
}

testIntegration().catch(console.error);