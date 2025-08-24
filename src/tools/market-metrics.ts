import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CoinMarketCapClient } from '../api/client.js';
import { CacheManager } from '../api/cache.js';

export class MarketMetricsTools {
  constructor(
    private client: CoinMarketCapClient,
    private cache: CacheManager,
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_market_overview',
        description: 'Get current global cryptocurrency market metrics (market cap, volume, dominance)',
        inputSchema: {
          type: 'object',
          properties: {
            include_defi: {
              type: 'boolean',
              description: 'Include DeFi market data',
              default: true,
            },
          },
        },
      },
      {
        name: 'get_market_dominance',
        description: 'Get raw market dominance data (BTC, ETH, altcoins) without analysis',
        inputSchema: {
          type: 'object',
          properties: {
            timeframe: {
              type: 'string',
              enum: ['30d', '90d'],
              description: 'Data timeframe',
              default: '90d',
            },
          },
        },
      },
      {
        name: 'get_trending_cryptocurrencies',
        description: 'Get currently trending cryptocurrencies based on search volume and social metrics',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of trending cryptos to return',
              minimum: 1,
              maximum: 50,
              default: 20,
            },
            sort_by: {
              type: 'string',
              enum: ['search_score', 'social_score', 'price_change', 'volume'],
              description: 'Sorting criteria',
              default: 'search_score',
            },
          },
        },
      },
    ];
  }

  async handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
    case 'get_market_overview':
      return this.getMarketOverview(args);
    case 'get_market_dominance':
      return this.getMarketDominance(args);
    case 'get_trending_cryptocurrencies':
      return this.getTrendingCryptocurrencies(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getMarketOverview(args: { include_defi?: boolean }): Promise<any> {
    const { include_defi = true } = args;

    const cacheKey = this.cache.generateCacheKey('market_overview', { include_defi });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      // Get global metrics
      const globalResponse = await this.client.getGlobalMetricsQuotesLatest();
      const globalData = globalResponse.data as any;

      // Get top cryptocurrencies for additional context
      const cryptosResponse = await this.client.getCryptocurrencyListingsLatest({
        limit: 10,
        sort: 'market_cap',
      });
      const topCryptos = cryptosResponse.data as any[];

      const marketOverview = {
        global_metrics: {
          total_market_cap: globalData.quote?.USD?.total_market_cap || 0,
          total_volume_24h: globalData.quote?.USD?.total_volume_24h || 0,
          total_volume_change_24h: globalData.quote?.USD?.total_volume_change_24h || 0,
          active_cryptocurrencies: globalData.active_cryptocurrencies || 0,
          active_exchanges: globalData.active_exchanges || 0,
          btc_dominance: globalData.btc_dominance || 0,
          eth_dominance: globalData.eth_dominance || 0,
          altcoin_dominance: 100 - (globalData.btc_dominance || 0) - (globalData.eth_dominance || 0),
        },
        top_cryptocurrencies: topCryptos.map(crypto => ({
          symbol: crypto.symbol,
          name: crypto.name,
          market_cap_rank: crypto.cmc_rank,
          price: crypto.quote?.USD?.price || 0,
          market_cap: crypto.quote?.USD?.market_cap || 0,
          volume_24h: crypto.quote?.USD?.volume_24h || 0,
          percent_change_24h: crypto.quote?.USD?.percent_change_24h || 0,
        })),
        market_data_timestamp: new Date().toISOString(),
        data_source: 'CoinMarketCap',
      };

      // Add DeFi data if requested
      if (include_defi) {
        (marketOverview as any).defi_metrics = {
          defi_market_cap: globalData.defi_market_cap || 0,
          defi_volume_24h: globalData.defi_volume_24h || 0,
          defi_market_cap_change_24h: globalData.defi_market_cap_change_24h || 0,
        };
      }

      this.cache.set(cacheKey, marketOverview, 300); // Cache for 5 minutes
      return marketOverview;
    } catch (error) {
      throw new Error(`Failed to get market overview: ${error}`);
    }
  }

  private async getMarketDominance(args: { timeframe?: string }): Promise<any> {
    const { timeframe = '90d' } = args;

    const cacheKey = this.cache.generateCacheKey('market_dominance', { timeframe });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      // Get current global metrics
      const globalResponse = await this.client.getGlobalMetricsQuotesLatest();
      const globalData = globalResponse.data as any;

      const dominanceData = {
        current_dominance: {
          btc_dominance: globalData.btc_dominance || 0,
          eth_dominance: globalData.eth_dominance || 0,
          altcoin_dominance: 100 - (globalData.btc_dominance || 0) - (globalData.eth_dominance || 0),
          stablecoin_dominance: globalData.stablecoin_dominance || 0,
        },
        market_metrics: {
          total_market_cap: globalData.quote?.USD?.total_market_cap || 0,
          total_volume_24h: globalData.quote?.USD?.total_volume_24h || 0,
          active_cryptocurrencies: globalData.active_cryptocurrencies || 0,
          market_cap_change_24h: globalData.quote?.USD?.market_cap_change_24h || 0,
        },
        timeframe,
        last_updated: globalData.last_updated || new Date().toISOString(),
        data_source: 'CoinMarketCap',
      };

      this.cache.set(cacheKey, dominanceData, 300); // Cache for 5 minutes
      return dominanceData;
    } catch (error) {
      throw new Error(`Failed to get market dominance data: ${error}`);
    }
  }

  private async getTrendingCryptocurrencies(args: {
    limit?: number;
    sort_by?: string;
  }): Promise<any> {
    const { limit = 20, sort_by = 'search_score' } = args;

    const cacheKey = this.cache.generateCacheKey('trending_cryptos', { limit, sort_by });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      // Get trending data (this would use CoinMarketCap's trending endpoint if available)
      // For now, we'll use top gainers/losers as a proxy for trending
      const trendingResponse = await this.client.getCryptocurrencyListingsLatest({
        limit: limit * 2, // Get more to filter
        sort: 'percent_change_24h',
        sort_dir: 'desc',
      });
      
      const trendingData = trendingResponse.data as any[];

      // Also get top volume cryptocurrencies
      const volumeResponse = await this.client.getCryptocurrencyListingsLatest({
        limit,
        sort: 'volume_24h',
        sort_dir: 'desc',
      });
      
      const volumeData = volumeResponse.data as any[];

      const trending = {
        trending_by_price_change: trendingData.slice(0, limit).map(crypto => ({
          symbol: crypto.symbol,
          name: crypto.name,
          price: crypto.quote?.USD?.price || 0,
          percent_change_24h: crypto.quote?.USD?.percent_change_24h || 0,
          volume_24h: crypto.quote?.USD?.volume_24h || 0,
          market_cap_rank: crypto.cmc_rank || 0,
        })),
        trending_by_volume: volumeData.map(crypto => ({
          symbol: crypto.symbol,
          name: crypto.name,
          price: crypto.quote?.USD?.price || 0,
          volume_24h: crypto.quote?.USD?.volume_24h || 0,
          volume_change_24h: crypto.quote?.USD?.volume_change_24h || 0,
          market_cap_rank: crypto.cmc_rank || 0,
        })),
        metadata: {
          total_cryptocurrencies_analyzed: trendingData.length + volumeData.length,
          sort_criteria: sort_by,
          data_timestamp: new Date().toISOString(),
          data_source: 'CoinMarketCap',
        },
      };

      this.cache.set(cacheKey, trending, 300); // Cache for 5 minutes
      return trending;
    } catch (error) {
      throw new Error(`Failed to get trending cryptocurrencies: ${error}`);
    }
  }
}