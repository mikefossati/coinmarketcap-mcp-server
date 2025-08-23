import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import our tool classes
import { CoinMarketCapClient } from './api/client.js';
import { CacheManager } from './api/cache.js';
import { PriceDataTools } from './tools/price-data.js';
import { MarketMetricsTools } from './tools/market-metrics.js';
import { TechnicalAnalysisTools } from './tools/technical.js';
import { HistoricalAnalysisTools } from './tools/historical.js';
import { sanitizeInput } from './utils/validators.js';
import { ApiTierManager, ApiTier } from './config/api-tiers.js';

class CoinMarketCapMCPServer {
  private server: Server;
  private client: CoinMarketCapClient;
  private cache: CacheManager;
  private priceDataTools: PriceDataTools;
  private marketMetricsTools: MarketMetricsTools;
  private technicalAnalysisTools: TechnicalAnalysisTools;
  private historicalAnalysisTools: HistoricalAnalysisTools;
  private apiTierManager: ApiTierManager;

  constructor() {
    this.server = new Server(
      {
        name: 'coinmarketcap-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize API client and cache
    const apiKey = process.env.CMC_API_KEY;
    if (!apiKey) {
      throw new Error('CMC_API_KEY environment variable is required');
    }

    const baseURL = process.env.CMC_BASE_URL || 'https://pro-api.coinmarketcap.com';
    const maxRequestsPerMinute = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100');

    // Initialize API tier manager
    const apiTierString = (process.env.CMC_API_TIER || 'free').toLowerCase();
    const apiTier = apiTierString as ApiTier;
    this.apiTierManager = new ApiTierManager(apiTier);

    console.error(`[${new Date().toISOString()}] INFO: API Tier Configuration`, {
      tier: apiTier,
      availableTools: this.apiTierManager.getAvailableTools().length,
      unavailableTools: this.apiTierManager.getUnavailableTools().length,
      features: this.apiTierManager.getFeatureSupport()
    });

    this.client = new CoinMarketCapClient(apiKey, baseURL, maxRequestsPerMinute);

    // Initialize cache
    const cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS || '300');
    const cacheMaxKeys = parseInt(process.env.CACHE_MAX_KEYS || '1000');
    this.cache = new CacheManager(cacheTTL, 60, cacheMaxKeys);

    // Initialize tool classes
    this.priceDataTools = new PriceDataTools(this.client, this.cache);
    this.marketMetricsTools = new MarketMetricsTools(this.client, this.cache);
    this.technicalAnalysisTools = new TechnicalAnalysisTools(this.client, this.cache);
    this.historicalAnalysisTools = new HistoricalAnalysisTools(this.client, this.cache);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools = [
        ...this.priceDataTools.getTools(),
        ...this.marketMetricsTools.getTools(),
        ...this.technicalAnalysisTools.getTools(),
        ...this.historicalAnalysisTools.getTools(),
        // Server management tools (always available)
        {
          name: 'get_server_info',
          description: 'Get information about the MCP server, its capabilities, and status',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'get_cache_stats',
          description: 'Get cache performance statistics and hit rates',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'get_rate_limit_status',
          description: 'Get current rate limit status and API usage statistics',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'get_api_tier_status',
          description: 'Get current API tier status, available tools, and upgrade information',
          inputSchema: { type: 'object', properties: {} }
        },
      ];

      // Filter tools based on API tier availability (server management tools are always available)
      const serverManagementTools = ['get_server_info', 'get_cache_stats', 'get_rate_limit_status', 'get_api_tier_status'];
      const availableTools = allTools.filter(tool => 
        serverManagementTools.includes(tool.name) || this.apiTierManager.isToolAvailable(tool.name)
      );

      // Add tier information to tool descriptions
      const enhancedTools = availableTools.map(tool => ({
        ...tool,
        description: tool.description + ` [${this.apiTierManager.getTier().toUpperCase()} tier]`
      }));

      return {
        tools: enhancedTools,
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const requestId = Math.random().toString(36).substring(7);
      const startTime = Date.now();

      console.error(`[${new Date().toISOString()}] INFO: Tool execution started`, {
        requestId,
        toolName: name,
        argsProvided: !!args && Object.keys(args).length > 0,
        argKeys: args ? Object.keys(args) : []
      });

      try {
        // Check if tool is available for current API tier
        if (!this.apiTierManager.isToolAvailable(name)) {
          const errorMessage = this.apiTierManager.generateUnavailableToolError(name);
          
          console.error(`[${new Date().toISOString()}] WARN: Tool blocked due to API tier restrictions`, {
            requestId,
            toolName: name,
            currentTier: this.apiTierManager.getTier(),
            suggestion: 'Upgrade API plan or use available tools only'
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: errorMessage,
                  tool: name,
                  currentTier: this.apiTierManager.getTier(),
                  availableTools: this.apiTierManager.getAvailableTools(),
                  upgradeUrl: 'https://coinmarketcap.com/api/pricing/',
                  requestId,
                  timestamp: new Date().toISOString(),
                }, null, 2),
              },
            ],
            isError: true,
          };
        }

        // Sanitize input arguments
        const sanitizedArgs = sanitizeInput(args || {});

        // Route to appropriate tool handler
        let result;

        // Price data tools
        const priceDataToolNames = this.priceDataTools.getTools().map(t => t.name);
        if (priceDataToolNames.includes(name)) {
          result = await this.priceDataTools.handleToolCall(name, sanitizedArgs);
        }
        // Market metrics tools
        else if (this.marketMetricsTools.getTools().map(t => t.name).includes(name)) {
          result = await this.marketMetricsTools.handleToolCall(name, sanitizedArgs);
        }
        // Technical analysis tools
        else if (this.technicalAnalysisTools.getTools().map(t => t.name).includes(name)) {
          result = await this.technicalAnalysisTools.handleToolCall(name, sanitizedArgs);
        }
        // Historical analysis tools
        else if (this.historicalAnalysisTools.getTools().map(t => t.name).includes(name)) {
          result = await this.historicalAnalysisTools.handleToolCall(name, sanitizedArgs);
        }
        // Server info tools
        else if (name === 'get_server_info') {
          result = await this.getServerInfo();
        } else if (name === 'get_cache_stats') {
          result = await this.getCacheStats();
        } else if (name === 'get_rate_limit_status') {
          result = await this.getRateLimitStatus();
        } else if (name === 'get_api_tier_status') {
          result = await this.getApiTierStatus();
        } else {
          const notFoundError = new McpError(
            ErrorCode.MethodNotFound,
            `Tool '${name}' not found`
          );
          
          console.error(`[${new Date().toISOString()}] ERROR: Tool not found`, {
            requestId,
            toolName: name,
            availableTools: [
              ...this.priceDataTools.getTools().map(t => t.name),
              ...this.marketMetricsTools.getTools().map(t => t.name),
              ...this.technicalAnalysisTools.getTools().map(t => t.name),
              ...this.historicalAnalysisTools.getTools().map(t => t.name),
            ].slice(0, 5) // Log first 5 for brevity
          });
          
          throw notFoundError;
        }

        const duration = Date.now() - startTime;
        const resultSize = JSON.stringify(result).length;

        console.error(`[${new Date().toISOString()}] INFO: Tool execution completed successfully`, {
          requestId,
          toolName: name,
          duration: `${duration}ms`,
          resultSize: `${resultSize} bytes`,
          resultType: typeof result,
          hasData: !!result
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Enhanced error logging
        console.error(`[${new Date().toISOString()}] ERROR: Tool execution failed`, {
          requestId,
          toolName: name,
          duration: `${duration}ms`,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage,
          stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        });

        // Log additional context for specific error types
        if (errorMessage.includes('Rate limit exceeded')) {
          console.error(`[${new Date().toISOString()}] WARN: Rate limit exceeded for tool execution`, {
            requestId,
            toolName: name,
            suggestion: 'Consider implementing exponential backoff or caching'
          });
        } else if (errorMessage.includes('API key')) {
          console.error(`[${new Date().toISOString()}] ERROR: API authentication issue`, {
            requestId,
            toolName: name,
            suggestion: 'Check CMC_API_KEY environment variable'
          });
        } else if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
          console.error(`[${new Date().toISOString()}] ERROR: Network connectivity issue`, {
            requestId,
            toolName: name,
            suggestion: 'Check internet connection and CMC API status'
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: errorMessage,
                tool: name,
                requestId,
                timestamp: new Date().toISOString(),
                duration: `${duration}ms`,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });

    // Error handling
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      console.error('Shutting down CoinMarketCap MCP Server...');
      await this.server.close();
      process.exit(0);
    });
  }

  private async getServerInfo(): Promise<any> {
    return {
      server_name: 'CoinMarketCap MCP Server',
      version: '1.0.0',
      description: 'Real-time cryptocurrency analysis and market intelligence server',
      api_provider: 'CoinMarketCap Pro API',
      features: [
        'Real-time price data',
        'Market metrics and analysis',
        'Technical indicators (RSI, MACD, Moving Averages, Bollinger Bands)',
        'Historical data analysis',
        'Market cycle analysis',
        'Risk metrics calculation',
        'Portfolio performance analysis',
        'Trading signal generation',
        'Comparative analysis',
        'Market dominance tracking',
        'Altcoin season analysis',
      ],
      supported_cryptocurrencies: '10,000+',
      cache_enabled: true,
      rate_limiting: true,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      node_version: process.version,
      timestamp: new Date().toISOString(),
    };
  }

  private async getCacheStats(): Promise<any> {
    const stats = this.cache.getStats();
    return {
      cache_statistics: {
        total_keys: stats.keys,
        cache_hits: stats.hits,
        cache_misses: stats.misses,
        hit_rate: (stats.hitRate * 100).toFixed(2) + '%',
        memory_usage: {
          key_size: stats.ksize,
          value_size: stats.vsize,
          total_size: stats.ksize + stats.vsize,
        },
      },
      performance_impact: {
        estimated_api_calls_saved: stats.hits,
        estimated_latency_reduction: `${(stats.hits * 200).toLocaleString()}ms`,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async getRateLimitStatus(): Promise<any> {
    const stats = this.client.getRequestStats();
    return {
      rate_limit_status: {
        requests_made: stats.requestCount,
        max_requests_per_minute: stats.maxRequestsPerMinute,
        remaining_requests: stats.remainingRequests,
        reset_time: new Date(stats.lastResetTime + 60000).toISOString(),
        time_until_reset: Math.max(0, stats.lastResetTime + 60000 - Date.now()),
      },
      recommendations: this.generateRateLimitRecommendations(stats),
      timestamp: new Date().toISOString(),
    };
  }

  private generateRateLimitRecommendations(stats: any): string[] {
    const recommendations = [];
    
    const utilizationRate = stats.requestCount / stats.maxRequestsPerMinute;
    
    if (utilizationRate > 0.9) {
      recommendations.push('High API usage detected. Consider implementing longer cache TTL.');
      recommendations.push('Batch similar requests when possible to reduce API calls.');
    } else if (utilizationRate > 0.7) {
      recommendations.push('Moderate API usage. Monitor for potential rate limit issues.');
    } else {
      recommendations.push('API usage is within safe limits.');
    }
    
    if (stats.remainingRequests < 10) {
      recommendations.push('Low remaining requests. Consider waiting before making more calls.');
    }
    
    return recommendations;
  }

  private async getApiTierStatus(): Promise<any> {
    return {
      api_tier_status: {
        current_tier: this.apiTierManager.getTier(),
        available_tools: this.apiTierManager.getAvailableTools().length,
        unavailable_tools: this.apiTierManager.getUnavailableTools().length,
        feature_support: this.apiTierManager.getFeatureSupport(),
        rate_limits: this.apiTierManager.getRateLimits(),
      },
      available_tools: this.apiTierManager.getAvailableTools(),
      unavailable_tools: this.apiTierManager.getUnavailableTools(),
      upgrade_info: {
        current_limitations: this.generateTierLimitations(),
        upgrade_benefits: this.generateUpgradeBenefits(),
        upgrade_url: 'https://coinmarketcap.com/api/pricing/',
      },
      configuration: {
        environment_variable: 'CMC_API_TIER',
        current_value: this.apiTierManager.getTier(),
        available_values: ['free', 'startup', 'standard', 'professional', 'enterprise'],
        how_to_change: 'Set CMC_API_TIER=startup in your .env file and restart the server',
      },
      timestamp: new Date().toISOString(),
    };
  }

  private generateTierLimitations(): string[] {
    const limitations = [];
    const features = this.apiTierManager.getFeatureSupport();
    
    if (!features.historicalData) {
      limitations.push('No access to historical price data (OHLCV)');
    }
    if (!features.trendingData) {
      limitations.push('No access to trending cryptocurrencies data');
    }
    if (!features.technicalIndicators) {
      limitations.push('Cannot calculate technical indicators (RSI, MACD, etc.)');
    }
    if (!features.riskMetrics) {
      limitations.push('Cannot calculate risk metrics and portfolio analysis');
    }
    if (!features.advancedAnalytics) {
      limitations.push('Limited to basic price and market data only');
    }

    return limitations;
  }

  private generateUpgradeBenefits(): string[] {
    return [
      'Access to historical price data for technical analysis',
      'Real-time trending cryptocurrencies and market sentiment',
      'Technical indicators: RSI, MACD, Bollinger Bands, Moving Averages',
      'Risk metrics: VaR, Sharpe ratios, correlation analysis',
      'Advanced portfolio performance tracking',
      'Market cycle analysis and predictions',
      'Higher rate limits and call credits',
      'Commercial usage rights',
    ];
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    
    console.error(`[${new Date().toISOString()}] INFO: Starting CoinMarketCap MCP Server...`);
    console.error(`[${new Date().toISOString()}] INFO: Environment:`, {
      nodeEnv: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      uptime: `${process.uptime()}s`
    });

    await this.server.connect(transport);
    
    const allTools = [
      ...this.priceDataTools.getTools(),
      ...this.marketMetricsTools.getTools(),
      ...this.technicalAnalysisTools.getTools(),
      ...this.historicalAnalysisTools.getTools(),
    ];

    console.error(`[${new Date().toISOString()}] INFO: CoinMarketCap MCP Server running on stdio transport`);
    console.error(`[${new Date().toISOString()}] INFO: Server configuration:`, {
      totalTools: allTools.length,
      cacheEnabled: true,
      rateLimitingEnabled: true,
      apiProvider: 'CoinMarketCap Pro',
      transport: 'stdio'
    });

    console.error(`[${new Date().toISOString()}] INFO: Available tools by category:`);
    const toolsByCategory = {
      'Price Data': this.priceDataTools.getTools().length,
      'Market Analysis': this.marketMetricsTools.getTools().length,
      'Technical Analysis': this.technicalAnalysisTools.getTools().length,
      'Historical Analysis': this.historicalAnalysisTools.getTools().length,
    };
    
    Object.entries(toolsByCategory).forEach(([category, count]) => {
      console.error(`  - ${category}: ${count} tools`);
    });

    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.error(`[${new Date().toISOString()}] DEBUG: Detailed tool list:`);
      allTools.forEach(tool => {
        console.error(`    - ${tool.name}: ${tool.description}`);
      });
    }

    console.error(`[${new Date().toISOString()}] INFO: Server ready for requests...`);
    console.error(`[${new Date().toISOString()}] INFO: Logging level: ${process.env.DEBUG ? 'DEBUG' : 'INFO'}`);
  }
}

// Additional server management tools
const serverTools = [
  {
    name: 'get_server_info',
    description: 'Get information about the MCP server, its capabilities, and status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_cache_stats',
    description: 'Get cache performance statistics and hit rates',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_rate_limit_status',
    description: 'Get current rate limit status and API usage statistics',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_api_tier_status',
    description: 'Get current API tier status, available tools, and upgrade information',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Main execution
async function main() {
  try {
    const server = new CoinMarketCapMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start CoinMarketCap MCP Server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error in main:', error);
    process.exit(1);
  });
}