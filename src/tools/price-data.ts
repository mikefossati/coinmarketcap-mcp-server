import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CoinMarketCapClient } from '../api/client.js';
import { CacheManager } from '../api/cache.js';
import { CryptoQuote, SupportedCurrency, SortBy } from '../types/index.js';

export class PriceDataTools {
  constructor(
    private client: CoinMarketCapClient,
    private cache: CacheManager,
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_crypto_price',
        description: 'Get real-time price and market data for a specific cryptocurrency',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol (e.g., BTC, ETH, ADA)',
            },
            convert: {
              type: 'string',
              description: 'Currency to convert to (USD, EUR, BTC, etc.)',
              default: 'USD',
            },
            include_technical: {
              type: 'boolean',
              description: 'Include technical indicators in response',
              default: false,
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_multiple_prices',
        description: 'Get prices for multiple cryptocurrencies at once',
        inputSchema: {
          type: 'object',
          properties: {
            symbols: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of cryptocurrency symbols',
              maxItems: 50,
            },
            convert: {
              type: 'string',
              description: 'Currency to convert to',
              default: 'USD',
            },
            sort_by: {
              type: 'string',
              enum: ['market_cap', 'volume_24h', 'percent_change_24h', 'price', 'name'],
              description: 'Sort results by specified field',
              default: 'market_cap',
            },
          },
          required: ['symbols'],
        },
      },
      {
        name: 'get_top_cryptocurrencies',
        description: 'Get top cryptocurrencies by market capitalization',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of cryptocurrencies to return (1-5000)',
              minimum: 1,
              maximum: 5000,
              default: 100,
            },
            convert: {
              type: 'string',
              description: 'Currency to convert to',
              default: 'USD',
            },
            sort: {
              type: 'string',
              enum: ['market_cap', 'volume_24h', 'percent_change_24h', 'price', 'name'],
              default: 'market_cap',
            },
            price_min: {
              type: 'number',
              description: 'Minimum price filter',
              minimum: 0,
            },
            price_max: {
              type: 'number',
              description: 'Maximum price filter',
              minimum: 0,
            },
            market_cap_min: {
              type: 'number',
              description: 'Minimum market cap filter',
              minimum: 0,
            },
            market_cap_max: {
              type: 'number',
              description: 'Maximum market cap filter',
              minimum: 0,
            },
          },
        },
      },
      {
        name: 'search_cryptocurrencies',
        description: 'Search for cryptocurrencies by name or symbol',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term (name or symbol)',
              minLength: 1,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              minimum: 1,
              maximum: 100,
              default: 10,
            },
            convert: {
              type: 'string',
              description: 'Currency to convert to',
              default: 'USD',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
    case 'get_crypto_price':
      return this.getCryptoPrice(args);
    case 'get_multiple_prices':
      return this.getMultiplePrices(args);
    case 'get_top_cryptocurrencies':
      return this.getTopCryptocurrencies(args);
    case 'search_cryptocurrencies':
      return this.searchCryptocurrencies(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getCryptoPrice(args: {
    symbol: string;
    convert?: string;
    include_technical?: boolean;
  }): Promise<any> {
    const { symbol, convert = 'USD', include_technical = false } = args;
    const cacheKey = this.cache.generateCacheKey('crypto_price', { symbol, convert });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const response = await this.client.getCryptocurrencyQuotesLatest({
        symbol: symbol.toUpperCase(),
        convert: convert.toUpperCase(),
        aux: 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply',
      });

      const responseData = response.data as any;
      if (!responseData || !responseData[symbol.toUpperCase()]) {
        throw new Error(`Cryptocurrency ${symbol} not found`);
      }

      const crypto = responseData[symbol.toUpperCase()][0];
      const quote = crypto.quote[convert.toUpperCase()];

      result = {
        id: crypto.id,
        name: crypto.name,
        symbol: crypto.symbol,
        slug: crypto.slug,
        rank: crypto.cmc_rank,
        price: quote.price,
        market_cap: quote.market_cap,
        volume_24h: quote.volume_24h,
        volume_change_24h: quote.volume_change_24h,
        percent_change_1h: quote.percent_change_1h,
        percent_change_24h: quote.percent_change_24h,
        percent_change_7d: quote.percent_change_7d,
        percent_change_30d: quote.percent_change_30d,
        market_cap_dominance: quote.market_cap_dominance,
        fully_diluted_market_cap: quote.fully_diluted_market_cap,
        circulating_supply: crypto.circulating_supply,
        total_supply: crypto.total_supply,
        max_supply: crypto.max_supply,
        num_market_pairs: crypto.num_market_pairs,
        date_added: crypto.date_added,
        tags: crypto.tags,
        platform: crypto.platform,
        last_updated: quote.last_updated,
        convert_currency: convert.toUpperCase(),
      };

      this.cache.set(cacheKey, result, 60); // Cache for 1 minute
      return result;
    } catch (error) {
      throw new Error(`Failed to get price for ${symbol}: ${error}`);
    }
  }

  private async getMultiplePrices(args: {
    symbols: string[];
    convert?: string;
    sort_by?: string;
  }): Promise<any> {
    const { symbols, convert = 'USD', sort_by = 'market_cap' } = args;
    const symbolsStr = symbols.map(s => s.toUpperCase()).join(',');
    const cacheKey = this.cache.generateCacheKey('multiple_prices', { symbols: symbolsStr, convert, sort_by });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const response = await this.client.getCryptocurrencyQuotesLatest({
        symbol: symbolsStr,
        convert: convert.toUpperCase(),
        aux: 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply',
      });

      const prices = Object.values(response.data as any).map((cryptoArray: any) => {
        const crypto = cryptoArray[0];
        const quote = crypto.quote[convert.toUpperCase()];

        return {
          id: crypto.id,
          name: crypto.name,
          symbol: crypto.symbol,
          rank: crypto.cmc_rank,
          price: quote.price,
          market_cap: quote.market_cap,
          volume_24h: quote.volume_24h,
          percent_change_1h: quote.percent_change_1h,
          percent_change_24h: quote.percent_change_24h,
          percent_change_7d: quote.percent_change_7d,
          market_cap_dominance: quote.market_cap_dominance,
          last_updated: quote.last_updated,
        };
      });

      // Sort by specified field
      prices.sort((a, b) => {
        const aVal = a[sort_by as keyof typeof a] || 0;
        const bVal = b[sort_by as keyof typeof b] || 0;
        return (bVal as number) - (aVal as number);
      });

      result = {
        cryptocurrencies: prices,
        count: prices.length,
        convert_currency: convert.toUpperCase(),
        sorted_by: sort_by,
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, result, 60);
      return result;
    } catch (error) {
      throw new Error(`Failed to get multiple prices: ${error}`);
    }
  }

  private async getTopCryptocurrencies(args: {
    limit?: number;
    convert?: string;
    sort?: string;
    price_min?: number;
    price_max?: number;
    market_cap_min?: number;
    market_cap_max?: number;
  }): Promise<any> {
    const {
      limit = 100,
      convert = 'USD',
      sort = 'market_cap',
      price_min,
      price_max,
      market_cap_min,
      market_cap_max,
    } = args;

    const cacheKey = this.cache.generateCacheKey('top_cryptocurrencies', {
      limit, convert, sort, price_min, price_max, market_cap_min, market_cap_max,
    });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const response = await this.client.getCryptocurrencyListingsLatest({
        start: 1,
        limit: Math.min(limit, 5000),
        convert: convert.toUpperCase(),
        sort,
        sort_dir: 'desc',
        price_min,
        price_max,
        market_cap_min,
        market_cap_max,
        aux: 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply',
      });

      const cryptocurrencies = (response.data as any[]).map((crypto: any) => {
        const quote = crypto.quote[convert.toUpperCase()];
        return {
          id: crypto.id,
          name: crypto.name,
          symbol: crypto.symbol,
          slug: crypto.slug,
          rank: crypto.cmc_rank,
          price: quote.price,
          market_cap: quote.market_cap,
          volume_24h: quote.volume_24h,
          percent_change_1h: quote.percent_change_1h,
          percent_change_24h: quote.percent_change_24h,
          percent_change_7d: quote.percent_change_7d,
          percent_change_30d: quote.percent_change_30d,
          market_cap_dominance: quote.market_cap_dominance,
          circulating_supply: crypto.circulating_supply,
          total_supply: crypto.total_supply,
          max_supply: crypto.max_supply,
          num_market_pairs: crypto.num_market_pairs,
          date_added: crypto.date_added,
          tags: crypto.tags,
          last_updated: quote.last_updated,
        };
      });

      result = {
        cryptocurrencies,
        count: cryptocurrencies.length,
        convert_currency: convert.toUpperCase(),
        filters: {
          sort,
          price_min,
          price_max,
          market_cap_min,
          market_cap_max,
        },
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, result, 120); // Cache for 2 minutes
      return result;
    } catch (error) {
      throw new Error(`Failed to get top cryptocurrencies: ${error}`);
    }
  }

  private async searchCryptocurrencies(args: {
    query: string;
    limit?: number;
    convert?: string;
  }): Promise<any> {
    const { query, limit = 10, convert = 'USD' } = args;
    const cacheKey = this.cache.generateCacheKey('search_cryptocurrencies', { query, limit, convert });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      // Get top cryptocurrencies and filter by search term
      const response = await this.client.getCryptocurrencyListingsLatest({
        start: 1,
        limit: 1000, // Get more to search through
        convert: convert.toUpperCase(),
        sort: 'market_cap',
        sort_dir: 'desc',
      });

      const searchTerm = query.toLowerCase();
      const matches = (response.data as any[])
        .filter((crypto: any) => 
          crypto.name.toLowerCase().includes(searchTerm) ||
          crypto.symbol.toLowerCase().includes(searchTerm) ||
          crypto.slug.toLowerCase().includes(searchTerm),
        )
        .slice(0, limit)
        .map((crypto: any) => {
          const quote = crypto.quote[convert.toUpperCase()];
          return {
            id: crypto.id,
            name: crypto.name,
            symbol: crypto.symbol,
            slug: crypto.slug,
            rank: crypto.cmc_rank,
            price: quote.price,
            market_cap: quote.market_cap,
            volume_24h: quote.volume_24h,
            percent_change_24h: quote.percent_change_24h,
            last_updated: quote.last_updated,
          };
        });

      result = {
        query,
        matches,
        count: matches.length,
        convert_currency: convert.toUpperCase(),
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return result;
    } catch (error) {
      throw new Error(`Failed to search cryptocurrencies: ${error}`);
    }
  }
}