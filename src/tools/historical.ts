import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CoinMarketCapClient } from '../api/client.js';
import { CacheManager } from '../api/cache.js';

export class HistoricalAnalysisTools {
  constructor(
    private client: CoinMarketCapClient,
    private cache: CacheManager,
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_historical_data',
        description: 'Get raw historical price and volume data without analysis',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol (e.g., BTC, ETH)',
            },
            time_start: {
              type: 'string',
              description: 'Start date (YYYY-MM-DD)',
            },
            time_end: {
              type: 'string',
              description: 'End date (YYYY-MM-DD)',
            },
            interval: {
              type: 'string',
              enum: ['1d', '1h'],
              description: 'Data interval',
              default: '1d',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_price_history',
        description: 'Get simple price history data for a cryptocurrency',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol',
            },
            periods: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['7d', '30d', '90d', '1y'],
              },
              description: 'Time periods to fetch',
              default: ['7d', '30d', '90d'],
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'compare_historical_data',
        description: 'Get raw historical data for multiple cryptocurrencies for comparison',
        inputSchema: {
          type: 'object',
          properties: {
            symbols: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of cryptocurrency symbols to compare',
              maxItems: 10,
            },
            timeframe: {
              type: 'string',
              enum: ['7d', '30d', '90d'],
              description: 'Comparison timeframe',
              default: '30d',
            },
          },
          required: ['symbols'],
        },
      },
    ];
  }

  async handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
    case 'get_historical_data':
      return this.getHistoricalData(args as { symbol: string; time_start?: string; time_end?: string; interval?: string });
    case 'get_price_history':
      return this.getPriceHistory(args as { symbol: string; periods?: string[] });
    case 'compare_historical_data':
      return this.compareHistoricalData(args as { symbols: string[]; timeframe?: string });
    default:
      throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getHistoricalData(args: {
    symbol: string;
    time_start?: string;
    time_end?: string;
    interval?: string;
  }): Promise<any> {
    const { 
      symbol, 
      time_start, 
      time_end, 
      interval = '1d',
    } = args;

    // Set default time range if not provided
    const endDate = time_end ? new Date(time_end) : new Date();
    const startDate = time_start ? new Date(time_start) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const cacheKey = this.cache.generateCacheKey('historical_data', {
      symbol, time_start: startDate.toISOString(), time_end: endDate.toISOString(), interval,
    });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const historicalData = await this.getHistoricalDataForPeriod(symbol, startDate, endDate);
      
      if (!historicalData || historicalData.length === 0) {
        throw new Error(`No historical data available for ${symbol}`);
      }

      const rawHistoricalData = {
        symbol: symbol.toUpperCase(),
        period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          interval,
          total_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        },
        historical_quotes: historicalData.map(quote => ({
          timestamp: quote.time_close || quote.timestamp,
          open: quote.quote?.USD?.open || quote.open,
          high: quote.quote?.USD?.high || quote.high,
          low: quote.quote?.USD?.low || quote.low,
          close: quote.quote?.USD?.close || quote.close || quote.price,
          volume: quote.quote?.USD?.volume || quote.volume,
          market_cap: quote.quote?.USD?.market_cap || quote.market_cap,
        })),
        metadata: {
          total_data_points: historicalData.length,
          data_source: 'CoinMarketCap',
          last_updated: new Date().toISOString(),
        },
      };

      this.cache.set(cacheKey, rawHistoricalData, 600); // Cache for 10 minutes
      return rawHistoricalData;
    } catch (error) {
      throw new Error(`Failed to get historical data for ${symbol}: ${error}`);
    }
  }

  private async getPriceHistory(args: {
    symbol: string;
    periods?: string[];
  }): Promise<any> {
    const { 
      symbol, 
      periods = ['7d', '30d', '90d'],
    } = args;

    const cacheKey = this.cache.generateCacheKey('price_history', {
      symbol, periods,
    });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const priceHistory: any = {
        symbol: symbol.toUpperCase(),
        price_data: {},
        last_updated: new Date().toISOString(),
      };

      for (const period of periods) {
        try {
          const days = this.periodToDays(period);
          const endDate = new Date();
          const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
          
          const historicalData = await this.getHistoricalDataForPeriod(symbol, startDate, endDate);
          
          if (historicalData && historicalData.length > 0) {
            priceHistory.price_data[period] = {
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              data_points: historicalData.length,
              prices: historicalData.map(d => ({
                date: d.time_close || d.timestamp,
                price: d.quote?.USD?.close || d.quote?.USD?.price || d.price,
                volume: d.quote?.USD?.volume || d.volume,
              })),
              first_price: historicalData[0]?.quote?.USD?.close || historicalData[0]?.quote?.USD?.price || historicalData[0]?.price,
              last_price: historicalData[historicalData.length - 1]?.quote?.USD?.close || historicalData[historicalData.length - 1]?.price,
            };
          }
        } catch (error) {
          priceHistory.price_data[period] = {
            error: `Data unavailable for ${period}`,
          };
        }
      }

      this.cache.set(cacheKey, priceHistory, 600); // Cache for 10 minutes
      return priceHistory;
    } catch (error) {
      throw new Error(`Failed to get price history for ${symbol}: ${error}`);
    }
  }

  private async compareHistoricalData(args: {
    symbols: string[];
    timeframe?: string;
  }): Promise<any> {
    const { 
      symbols, 
      timeframe = '30d',
    } = args;

    const cacheKey = this.cache.generateCacheKey('historical_comparison', {
      symbols: symbols.join(','), timeframe,
    });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const days = this.periodToDays(timeframe);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const comparisons = [];
      
      for (const symbol of symbols) {
        try {
          const historicalData = await this.getHistoricalDataForPeriod(symbol, startDate, endDate);
          
          if (historicalData && historicalData.length > 0) {
            comparisons.push({
              symbol: symbol.toUpperCase(),
              timeframe,
              data_available: true,
              data_points: historicalData.length,
              price_data: {
                start_price: historicalData[0]?.quote?.USD?.close || historicalData[0]?.quote?.USD?.price || historicalData[0]?.price,
                end_price: historicalData[historicalData.length - 1]?.quote?.USD?.close || historicalData[historicalData.length - 1]?.price,
                highest_price: Math.max(...historicalData.map(d => d.quote?.USD?.high || d.quote?.USD?.price || d.price || 0)),
                lowest_price: Math.min(...historicalData.map(d => d.quote?.USD?.low || d.quote?.USD?.price || d.price || Infinity)),
              },
              volume_data: {
                total_volume: historicalData.reduce((sum, d) => sum + (d.quote?.USD?.volume || d.volume || 0), 0),
                average_volume: historicalData.reduce((sum, d) => sum + (d.quote?.USD?.volume || d.volume || 0), 0) / historicalData.length,
              },
              raw_historical_data: historicalData.map(d => ({
                date: d.time_close || d.timestamp,
                price: d.quote?.USD?.close || d.quote?.USD?.price || d.price,
                volume: d.quote?.USD?.volume || d.volume,
              })),
            });
          } else {
            comparisons.push({
              symbol: symbol.toUpperCase(),
              timeframe,
              data_available: false,
              error: 'No historical data available',
            });
          }
        } catch (error) {
          comparisons.push({
            symbol: symbol.toUpperCase(),
            timeframe,
            data_available: false,
            error: `Failed to fetch data: ${error}`,
          });
        }
      }

      const comparison = {
        comparison_period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          timeframe,
          total_days: days,
        },
        cryptocurrencies: comparisons,
        metadata: {
          total_symbols_requested: symbols.length,
          successful_data_fetches: comparisons.filter(c => c.data_available).length,
          data_source: 'CoinMarketCap',
          last_updated: new Date().toISOString(),
        },
      };

      this.cache.set(cacheKey, comparison, 600); // Cache for 10 minutes
      return comparison;
    } catch (error) {
      throw new Error(`Failed to compare historical data: ${error}`);
    }
  }

  private periodToDays(period: string): number {
    const periodMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
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