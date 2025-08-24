import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CoinMarketCapClient } from '../api/client.js';
import { CacheManager } from '../api/cache.js';

export class TechnicalAnalysisTools {
  constructor(
    private client: CoinMarketCapClient,
    private cache: CacheManager,
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_technical_data',
        description: 'Get raw historical price and volume data for technical analysis (returns raw data arrays without calculations)',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol (e.g., BTC, ETH)',
            },
            timeframe: {
              type: 'string',
              enum: ['1d', '7d', '30d', '90d'],
              description: 'Historical data timeframe',
              default: '30d',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_price_data',
        description: 'Get raw price and volume historical data (no analysis or patterns)',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol',
            },
            timeframe: {
              type: 'string',
              enum: ['1d', '7d', '30d', '90d'],
              description: 'Analysis timeframe',
              default: '30d',
            },
          },
          required: ['symbol'],
        },
      },
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
    case 'get_technical_data':
      return this.getTechnicalData(args);
    case 'get_price_data':
      return this.getPriceData(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getTechnicalData(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<any> {
    const { symbol, timeframe = '30d' } = args;

    const cacheKey = this.cache.generateCacheKey('raw_technical_data', { symbol, timeframe });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const days = this.periodToDays(timeframe);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const historicalData = await this.getHistoricalDataForPeriod(symbol, startDate, endDate);
      
      if (!historicalData || historicalData.length === 0) {
        throw new Error(`No historical data available for ${symbol}`);
      }

      // Return raw data arrays only - no calculations
      const rawData = {
        symbol: symbol.toUpperCase(),
        timeframe,
        data_points: historicalData.length,
        raw_data: {
          timestamps: historicalData.map(d => d.time_close || d.timestamp),
          prices: historicalData.map(d => d.quote?.USD?.price || d.price),
          volumes: historicalData.map(d => d.quote?.USD?.volume_24h || d.volume),
          market_caps: historicalData.map(d => d.quote?.USD?.market_cap || d.market_cap),
          highs: historicalData.map(d => d.quote?.USD?.high || d.high),
          lows: historicalData.map(d => d.quote?.USD?.low || d.low),
        },
        metadata: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          data_source: 'CoinMarketCap',
          last_updated: new Date().toISOString(),
        },
      };

      this.cache.set(cacheKey, rawData, 300); // Cache for 5 minutes
      return rawData;
    } catch (error) {
      throw new Error(`Failed to fetch technical data for ${symbol}: ${error}`);
    }
  }

  private async getPriceData(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<any> {
    const { symbol, timeframe = '30d' } = args;

    const cacheKey = this.cache.generateCacheKey('raw_price_data', { symbol, timeframe });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const days = this.periodToDays(timeframe);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const historicalData = await this.getHistoricalDataForPeriod(symbol, startDate, endDate);
      
      if (!historicalData || historicalData.length === 0) {
        throw new Error(`No price data available for ${symbol}`);
      }

      // Return only raw price and volume data
      const priceData = {
        symbol: symbol.toUpperCase(),
        timeframe,
        period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          total_days: days,
        },
        price_history: historicalData.map(d => ({
          date: d.time_close || d.timestamp,
          price: d.quote?.USD?.price || d.price,
          volume_24h: d.quote?.USD?.volume_24h || d.volume,
          market_cap: d.quote?.USD?.market_cap || d.market_cap,
          price_change_24h: d.quote?.USD?.percent_change_24h,
        })),
        summary: {
          total_data_points: historicalData.length,
          first_price: historicalData[0]?.quote?.USD?.price || historicalData[0]?.price,
          last_price: historicalData[historicalData.length - 1]?.quote?.USD?.price || historicalData[historicalData.length - 1]?.price,
          data_source: 'CoinMarketCap',
          last_updated: new Date().toISOString(),
        },
      };

      this.cache.set(cacheKey, priceData, 300); // Cache for 5 minutes
      return priceData;
    } catch (error) {
      throw new Error(`Failed to fetch price data for ${symbol}: ${error}`);
    }
  }

  private periodToDays(period: string): number {
    const periodMap: Record<string, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    return periodMap[period] || 30;
  }

  private async getHistoricalDataForPeriod(symbol: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const startISO = startDate.toISOString().split('T')[0];
      const endISO = endDate.toISOString().split('T')[0];
      
      const response = await this.client.getCryptocurrencyOHLCVHistorical({
        symbol: symbol.toUpperCase(),
        time_start: startISO,
        time_end: endISO,
        interval: 'daily',
      });
      
      if (response?.data) {
        const data = response.data as any;
        return data.quotes || [];
      }
      
      return [];
    } catch (error) {
      console.error(`[${new Date().toISOString()}] WARN: Failed to fetch historical data for ${symbol}:`, error);
      return [];
    }
  }
}