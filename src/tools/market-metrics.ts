import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CoinMarketCapClient } from '../api/client.js';
import { CacheManager } from '../api/cache.js';
import { MarketMetrics } from '../types/index.js';

export class MarketMetricsTools {
  constructor(
    private client: CoinMarketCapClient,
    private cache: CacheManager,
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_market_overview',
        description: 'Get comprehensive cryptocurrency market overview with dominance, metrics, and trends',
        inputSchema: {
          type: 'object',
          properties: {
            convert: {
              type: 'string',
              description: 'Currency to convert to (USD, EUR, BTC, etc.)',
              default: 'USD',
            },
            include_trending: {
              type: 'boolean',
              description: 'Include trending cryptocurrencies',
              default: true,
            },
            include_gainers_losers: {
              type: 'boolean',
              description: 'Include top gainers and losers',
              default: true,
            },
          },
        },
      },
      {
        name: 'get_market_dominance',
        description: 'Get Bitcoin and Ethereum dominance percentages and analysis',
        inputSchema: {
          type: 'object',
          properties: {
            convert: {
              type: 'string',
              description: 'Currency to convert to',
              default: 'USD',
            },
            include_altcoin_analysis: {
              type: 'boolean',
              description: 'Include altcoin season analysis',
              default: true,
            },
          },
        },
      },
      {
        name: 'analyze_altcoin_season',
        description: 'Analyze current altcoin season indicators and probability',
        inputSchema: {
          type: 'object',
          properties: {
            timeframe: {
              type: 'string',
              enum: ['30d', '90d'],
              description: 'Analysis timeframe',
              default: '90d',
            },
            include_predictions: {
              type: 'boolean',
              description: 'Include predictive indicators',
              default: true,
            },
            include_historical_comparison: {
              type: 'boolean',
              description: 'Include historical altcoin season comparison',
              default: false,
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
              description: 'Number of trending coins to return (1-50)',
              minimum: 1,
              maximum: 50,
              default: 15,
            },
            time_period: {
              type: 'string',
              enum: ['24h', '7d', '30d'],
              description: 'Trending time period',
              default: '24h',
            },
            convert: {
              type: 'string',
              description: 'Currency to convert to',
              default: 'USD',
            },
          },
        },
      },
      {
        name: 'get_gainers_losers',
        description: 'Get top gaining and losing cryptocurrencies by percentage change',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of gainers/losers to return each (1-50)',
              minimum: 1,
              maximum: 50,
              default: 10,
            },
            time_period: {
              type: 'string',
              enum: ['1h', '24h', '7d'],
              description: 'Time period for percentage change',
              default: '24h',
            },
            convert: {
              type: 'string',
              description: 'Currency to convert to',
              default: 'USD',
            },
            min_market_cap: {
              type: 'number',
              description: 'Minimum market cap filter to avoid microcaps',
              minimum: 0,
              default: 1000000,
            },
          },
        },
      },
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
    case 'get_market_overview':
      return this.getMarketOverview(args);
    case 'get_market_dominance':
      return this.getMarketDominance(args);
    case 'analyze_altcoin_season':
      return this.analyzeAltcoinSeason(args);
    case 'get_trending_cryptocurrencies':
      return this.getTrendingCryptocurrencies(args);
    case 'get_gainers_losers':
      return this.getGainersLosers(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getMarketOverview(args: {
    convert?: string;
    include_trending?: boolean;
    include_gainers_losers?: boolean;
  }): Promise<any> {
    const { convert = 'USD', include_trending = true, include_gainers_losers = true } = args;
    const cacheKey = this.cache.generateCacheKey('market_overview', { convert, include_trending, include_gainers_losers });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      // Get global metrics
      const globalMetricsResponse = await this.client.getGlobalMetricsQuotesLatest({
        convert: convert.toUpperCase(),
      });

      const globalData = globalMetricsResponse.data as any;
      const quote = globalData.quote[convert.toUpperCase()];

      const marketOverview: any = {
        global_metrics: {
          active_cryptocurrencies: globalData.active_cryptocurrencies,
          active_exchanges: globalData.active_exchanges,
          active_market_pairs: globalData.active_market_pairs,
          total_market_cap: quote.total_market_cap,
          total_volume_24h: quote.total_volume_24h,
          btc_dominance: globalData.btc_dominance,
          eth_dominance: globalData.eth_dominance,
          altcoin_market_cap: quote.altcoin_market_cap,
          altcoin_volume_24h: quote.altcoin_volume_24h,
          market_cap_change_24h: quote.total_market_cap_yesterday_percentage_change,
          volume_change_24h: quote.total_volume_24h_yesterday_percentage_change,
          last_updated: quote.last_updated,
        },
        convert_currency: convert.toUpperCase(),
        timestamp: new Date().toISOString(),
      };

      // Add trending data if requested
      if (include_trending) {
        try {
          const trendingResponse = await this.client.getCryptocurrencyTrendingLatest({
            limit: 10,
            time_period: '24h',
            convert: convert.toUpperCase(),
          });

          marketOverview.trending = (trendingResponse.data as any).map((crypto: any) => ({
            id: crypto.id,
            name: crypto.name,
            symbol: crypto.symbol,
            rank: crypto.rank,
            price: crypto.price,
            volume_24h: crypto.volume_24h,
            percent_change_24h: crypto.percent_change_24h,
            avg_price_change: crypto.avg_price_change,
          }));
        } catch (error) {
          console.error(`[${new Date().toISOString()}] WARN: ` + 'Failed to fetch trending data:', error);
          marketOverview.trending = [];
        }
      }

      // Add gainers/losers if requested
      if (include_gainers_losers) {
        try {
          const gainersLosersResponse = await this.client.getCryptocurrencyTrendingGainersLosers({
            limit: 5,
            time_period: '24h',
            convert: convert.toUpperCase(),
            sort: 'percent_change_24h',
            sort_dir: 'desc',
          });

          const gainersLosers = gainersLosersResponse.data as any[];
          marketOverview.top_gainers = gainersLosers.slice(0, 5);
          marketOverview.top_losers = gainersLosers.slice(-5).reverse();
        } catch (error) {
          console.error(`[${new Date().toISOString()}] WARN: ` + 'Failed to fetch gainers/losers data:', error);
          marketOverview.top_gainers = [];
          marketOverview.top_losers = [];
        }
      }

      // Calculate market sentiment indicators
      marketOverview.sentiment_indicators = this.calculateMarketSentiment(marketOverview);

      this.cache.set(cacheKey, marketOverview, 180); // Cache for 3 minutes
      return marketOverview;
    } catch (error) {
      throw new Error(`Failed to get market overview: ${error}`);
    }
  }

  private async getMarketDominance(args: {
    convert?: string;
    include_altcoin_analysis?: boolean;
  }): Promise<any> {
    const { convert = 'USD', include_altcoin_analysis = true } = args;
    const cacheKey = this.cache.generateCacheKey('market_dominance', { convert, include_altcoin_analysis });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const globalMetricsResponse = await this.client.getGlobalMetricsQuotesLatest({
        convert: convert.toUpperCase(),
      });

      const globalData = globalMetricsResponse.data as any;
      const quote = globalData.quote[convert.toUpperCase()];

      const dominanceData: any = {
        btc_dominance: globalData.btc_dominance,
        eth_dominance: globalData.eth_dominance,
        altcoin_dominance: 100 - globalData.btc_dominance - globalData.eth_dominance,
        total_market_cap: quote.total_market_cap,
        btc_market_cap: quote.total_market_cap * (globalData.btc_dominance / 100),
        eth_market_cap: quote.total_market_cap * (globalData.eth_dominance / 100),
        altcoin_market_cap: quote.altcoin_market_cap,
        dominance_analysis: {
          btc_trend: this.analyzeDominanceTrend(globalData.btc_dominance),
          eth_trend: this.analyzeDominanceTrend(globalData.eth_dominance),
          altcoin_strength: this.analyzeAltcoinStrength(100 - globalData.btc_dominance - globalData.eth_dominance),
        },
        convert_currency: convert.toUpperCase(),
        last_updated: quote.last_updated,
      };

      if (include_altcoin_analysis) {
        dominanceData.altcoin_season_probability = this.calculateAltcoinSeasonProbability({
          btc_dominance: globalData.btc_dominance,
          eth_dominance: globalData.eth_dominance,
          altcoin_volume: quote.altcoin_volume_24h,
          total_volume: quote.total_volume_24h,
        });
      }

      this.cache.set(cacheKey, dominanceData, 300); // Cache for 5 minutes
      return dominanceData;
    } catch (error) {
      throw new Error(`Failed to get market dominance: ${error}`);
    }
  }

  private async analyzeAltcoinSeason(args: {
    timeframe?: string;
    include_predictions?: boolean;
    include_historical_comparison?: boolean;
  }): Promise<any> {
    const { 
      timeframe = '90d', 
      include_predictions = true, 
      include_historical_comparison = false, 
    } = args;
    
    const cacheKey = this.cache.generateCacheKey('altcoin_season_analysis', { 
      timeframe, include_predictions, include_historical_comparison, 
    });
    
    const result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      // Get current global metrics
      const globalResponse = await this.client.getGlobalMetricsQuotesLatest();
      const globalData = globalResponse.data as any;

      // Get top altcoins performance
      const topAltcoinsResponse = await this.client.getCryptocurrencyListingsLatest({
        start: 3, // Skip BTC and ETH
        limit: 50,
        sort: 'market_cap',
        sort_dir: 'desc',
        convert: 'USD',
      });

      const altcoins = topAltcoinsResponse.data as any[];
      const altcoinPerformance = this.analyzeAltcoinPerformance(altcoins, timeframe);

      const analysis: any = {
        current_status: this.determineAltcoinSeasonStatus(globalData, altcoinPerformance),
        btc_dominance: globalData.btc_dominance,
        eth_dominance: globalData.eth_dominance,
        altcoin_dominance: 100 - globalData.btc_dominance - globalData.eth_dominance,
        altcoin_season_probability: this.calculateAltcoinSeasonProbability({
          btc_dominance: globalData.btc_dominance,
          eth_dominance: globalData.eth_dominance,
          altcoin_volume: globalData.quote.USD.altcoin_volume_24h,
          total_volume: globalData.quote.USD.total_volume_24h,
        }),
        performance_metrics: altcoinPerformance,
        key_indicators: {
          altcoin_outperformance: altcoinPerformance.outperforming_btc_count > altcoinPerformance.total_count * 0.75,
          volume_surge: (globalData.quote.USD.altcoin_volume_24h / globalData.quote.USD.total_volume_24h) > 0.3,
          dominance_decline: globalData.btc_dominance < 40,
          breadth_expansion: altcoinPerformance.positive_performers > altcoinPerformance.total_count * 0.6,
        },
        timeframe,
        last_updated: new Date().toISOString(),
      };

      if (include_predictions) {
        analysis.predictions = this.generateAltcoinSeasonPredictions(analysis);
      }

      if (include_historical_comparison) {
        analysis.historical_comparison = this.getHistoricalAltcoinSeasonComparison();
      }

      this.cache.set(cacheKey, analysis, 600); // Cache for 10 minutes
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze altcoin season: ${error}`);
    }
  }

  private async getTrendingCryptocurrencies(args: {
    limit?: number;
    time_period?: string;
    convert?: string;
  }): Promise<any> {
    const { limit = 15, time_period = '24h', convert = 'USD' } = args;
    const cacheKey = this.cache.generateCacheKey('trending_cryptocurrencies', { limit, time_period, convert });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const response = await this.client.getCryptocurrencyTrendingLatest({
        limit: Math.min(limit, 50),
        time_period,
        convert: convert.toUpperCase(),
      });

      const trending = (response.data as any).map((crypto: any) => ({
        id: crypto.id,
        name: crypto.name,
        symbol: crypto.symbol,
        slug: crypto.slug,
        rank: crypto.rank,
        price: crypto.price,
        volume_24h: crypto.volume_24h,
        market_cap: crypto.market_cap,
        percent_change_24h: crypto.percent_change_24h,
        avg_price_change: crypto.avg_price_change,
        search_score: this.calculateTrendingScore(crypto),
      }));

      result = {
        trending_cryptocurrencies: trending,
        count: trending.length,
        time_period,
        convert_currency: convert.toUpperCase(),
        analysis: {
          average_change: trending.reduce((sum: number, coin: any) => sum + coin.percent_change_24h, 0) / trending.length,
          positive_trending: trending.filter((coin: any) => coin.percent_change_24h > 0).length,
          negative_trending: trending.filter((coin: any) => coin.percent_change_24h < 0).length,
          top_performer: trending.reduce((max: any, coin: any) => 
            coin.percent_change_24h > max.percent_change_24h ? coin : max, trending[0],
          ),
        },
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return result;
    } catch (error) {
      throw new Error(`Failed to get trending cryptocurrencies: ${error}`);
    }
  }

  private async getGainersLosers(args: {
    limit?: number;
    time_period?: string;
    convert?: string;
    min_market_cap?: number;
  }): Promise<any> {
    const { limit = 10, time_period = '24h', convert = 'USD', min_market_cap = 1000000 } = args;
    const cacheKey = this.cache.generateCacheKey('gainers_losers', { limit, time_period, convert, min_market_cap });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const response = await this.client.getCryptocurrencyTrendingGainersLosers({
        limit: Math.min(limit * 4, 200), // Get more to filter by market cap
        time_period,
        convert: convert.toUpperCase(),
        sort: 'percent_change_24h',
        sort_dir: 'desc',
      });

      // Filter by minimum market cap
      const filtered = (response.data as any[]).filter((crypto: any) => crypto.market_cap >= min_market_cap);
      
      const gainers = filtered.slice(0, limit);
      const losers = filtered.slice(-limit).reverse();

      result = {
        top_gainers: gainers.map((crypto: any) => ({
          id: crypto.id,
          name: crypto.name,
          symbol: crypto.symbol,
          rank: crypto.rank,
          price: crypto.price,
          market_cap: crypto.market_cap,
          volume_24h: crypto.volume_24h,
          percent_change_1h: crypto.percent_change_1h,
          percent_change_24h: crypto.percent_change_24h,
          percent_change_7d: crypto.percent_change_7d,
        })),
        top_losers: losers.map((crypto: any) => ({
          id: crypto.id,
          name: crypto.name,
          symbol: crypto.symbol,
          rank: crypto.rank,
          price: crypto.price,
          market_cap: crypto.market_cap,
          volume_24h: crypto.volume_24h,
          percent_change_1h: crypto.percent_change_1h,
          percent_change_24h: crypto.percent_change_24h,
          percent_change_7d: crypto.percent_change_7d,
        })),
        filters: {
          time_period,
          min_market_cap,
          limit,
        },
        convert_currency: convert.toUpperCase(),
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, result, 180); // Cache for 3 minutes
      return result;
    } catch (error) {
      throw new Error(`Failed to get gainers and losers: ${error}`);
    }
  }

  // Helper methods
  private calculateMarketSentiment(marketOverview: any): any {
    const { global_metrics } = marketOverview;
    
    return {
      fear_greed_index: this.calculateFearGreedIndex(global_metrics),
      market_momentum: global_metrics.market_cap_change_24h > 0 ? 'bullish' : 'bearish',
      volume_trend: global_metrics.volume_change_24h > 0 ? 'increasing' : 'decreasing',
      dominance_trend: global_metrics.btc_dominance > 50 ? 'btc_dominant' : 'altcoin_season',
      overall_sentiment: this.determineOverallSentiment(global_metrics),
    };
  }

  private calculateFearGreedIndex(metrics: any): number {
    // Simplified Fear & Greed calculation based on available metrics
    let score = 50; // neutral
    
    // Market cap change influence
    score += Math.min(Math.max(metrics.market_cap_change_24h * 2, -25), 25);
    
    // Volume change influence
    score += Math.min(Math.max(metrics.volume_change_24h * 1, -15), 15);
    
    // BTC dominance influence (lower dominance = more greed)
    if (metrics.btc_dominance < 40) score += 10;
    else if (metrics.btc_dominance > 60) score -= 10;

    return Math.min(Math.max(score, 0), 100);
  }

  private analyzeDominanceTrend(dominance: number): string {
    if (dominance > 60) return 'very_high';
    if (dominance > 50) return 'high';
    if (dominance > 40) return 'moderate';
    if (dominance > 30) return 'low';
    return 'very_low';
  }

  private analyzeAltcoinStrength(altcoinDominance: number): string {
    if (altcoinDominance > 40) return 'very_strong';
    if (altcoinDominance > 30) return 'strong';
    if (altcoinDominance > 20) return 'moderate';
    if (altcoinDominance > 15) return 'weak';
    return 'very_weak';
  }

  private calculateAltcoinSeasonProbability(data: any): number {
    let probability = 0;
    
    // BTC dominance factor (lower = higher probability)
    if (data.btc_dominance < 35) probability += 30;
    else if (data.btc_dominance < 40) probability += 20;
    else if (data.btc_dominance < 45) probability += 10;
    
    // Altcoin volume factor
    const altcoinVolumeRatio = data.altcoin_volume / data.total_volume;
    if (altcoinVolumeRatio > 0.4) probability += 25;
    else if (altcoinVolumeRatio > 0.3) probability += 15;
    else if (altcoinVolumeRatio > 0.25) probability += 10;
    
    // ETH dominance factor
    if (data.eth_dominance > 20) probability += 15;
    else if (data.eth_dominance > 15) probability += 10;
    else if (data.eth_dominance > 12) probability += 5;
    
    return Math.min(probability, 100);
  }

  private analyzeAltcoinPerformance(altcoins: any[], timeframe: string): any {
    const performanceKey = timeframe === '30d' ? 'percent_change_30d' : 'percent_change_7d';
    
    const metrics = {
      total_count: altcoins.length,
      positive_performers: 0,
      negative_performers: 0,
      outperforming_btc_count: 0,
      average_performance: 0,
      median_performance: 0,
      best_performer: null as any,
      worst_performer: null as any,
    };

    const performances = altcoins.map(coin => {
      const performance = coin.quote.USD[performanceKey] || 0;
      if (performance > 0) metrics.positive_performers++;
      else metrics.negative_performers++;
      
      // Assume BTC performance benchmark (would need separate API call for exact data)
      const btcBenchmark = timeframe === '30d' ? 5 : 2; // Simplified benchmark
      if (performance > btcBenchmark) metrics.outperforming_btc_count++;
      
      return {
        symbol: coin.symbol,
        performance,
        market_cap: coin.quote.USD.market_cap,
      };
    });

    performances.sort((a, b) => b.performance - a.performance);
    
    metrics.average_performance = performances.reduce((sum, p) => sum + p.performance, 0) / performances.length;
    metrics.median_performance = performances[Math.floor(performances.length / 2)].performance;
    metrics.best_performer = performances[0];
    metrics.worst_performer = performances[performances.length - 1];

    return metrics;
  }

  private determineAltcoinSeasonStatus(globalData: any, performance: any): string {
    const probability = this.calculateAltcoinSeasonProbability({
      btc_dominance: globalData.btc_dominance,
      eth_dominance: globalData.eth_dominance,
      altcoin_volume: globalData.quote.USD.altcoin_volume_24h,
      total_volume: globalData.quote.USD.total_volume_24h,
    });

    if (probability > 75) return 'strong_altcoin_season';
    if (probability > 50) return 'moderate_altcoin_season';
    if (probability > 25) return 'early_altcoin_season';
    return 'btc_dominance_phase';
  }

  private calculateTrendingScore(crypto: any): number {
    // Combine price change and volume for trending score
    const priceWeight = Math.abs(crypto.percent_change_24h) * 0.4;
    const volumeWeight = Math.log(crypto.volume_24h) * 0.3;
    const avgChangeWeight = Math.abs(crypto.avg_price_change) * 0.3;
    
    return priceWeight + volumeWeight + avgChangeWeight;
  }

  private determineOverallSentiment(metrics: any): string {
    const fearGreedIndex = this.calculateFearGreedIndex(metrics);
    
    if (fearGreedIndex > 75) return 'extreme_greed';
    if (fearGreedIndex > 55) return 'greed';
    if (fearGreedIndex > 45) return 'neutral';
    if (fearGreedIndex > 25) return 'fear';
    return 'extreme_fear';
  }

  private generateAltcoinSeasonPredictions(analysis: any): any {
    return {
      short_term_outlook: analysis.altcoin_season_probability > 60 ? 'bullish' : 'neutral',
      key_levels: {
        btc_dominance_support: 35,
        btc_dominance_resistance: 50,
        altcoin_breakout_threshold: 40,
      },
      catalysts: this.identifyAltcoinSeasonCatalysts(analysis),
      risk_factors: this.identifyRiskFactors(analysis),
    };
  }

  private getHistoricalAltcoinSeasonComparison(): any {
    // This would require historical data - simplified for now
    return {
      previous_seasons: [
        { period: '2017-2018', btc_dominance_low: 32, duration_days: 120 },
        { period: '2020-2021', btc_dominance_low: 38, duration_days: 90 },
      ],
      current_comparison: 'early_stage',
      historical_patterns: 'following_typical_cycle',
    };
  }

  private identifyAltcoinSeasonCatalysts(analysis: any): string[] {
    const catalysts = [];
    
    if (analysis.btc_dominance < 40) catalysts.push('btc_dominance_decline');
    if (analysis.key_indicators.volume_surge) catalysts.push('altcoin_volume_surge');
    if (analysis.key_indicators.breadth_expansion) catalysts.push('broad_market_participation');
    if (analysis.performance_metrics.outperforming_btc_count > analysis.performance_metrics.total_count * 0.7) {
      catalysts.push('widespread_altcoin_outperformance');
    }
    
    return catalysts;
  }

  private identifyRiskFactors(analysis: any): string[] {
    const risks = [];
    
    if (analysis.btc_dominance > 60) risks.push('high_btc_dominance');
    if (analysis.performance_metrics.negative_performers > analysis.performance_metrics.positive_performers) {
      risks.push('negative_altcoin_performance');
    }
    if (analysis.altcoin_season_probability < 30) risks.push('low_altcoin_season_probability');
    
    return risks;
  }
}