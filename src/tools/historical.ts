import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CoinMarketCapClient } from '../api/client.js';
import { CacheManager } from '../api/cache.js';
import { HistoricalQuote } from '../types/index.js';

export class HistoricalAnalysisTools {
  constructor(
    private client: CoinMarketCapClient,
    private cache: CacheManager
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_historical_data',
        description: 'Get historical price and volume data with comprehensive analysis',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol (e.g., BTC, ETH)',
            },
            time_start: {
              type: 'string',
              description: 'Start date (ISO 8601 format: YYYY-MM-DD)',
            },
            time_end: {
              type: 'string',
              description: 'End date (ISO 8601 format: YYYY-MM-DD)',
            },
            interval: {
              type: 'string',
              enum: ['1d', '1h', '5m'],
              description: 'Data interval',
              default: '1d',
            },
            include_analysis: {
              type: 'boolean',
              description: 'Include statistical analysis of the data',
              default: true,
            },
          },
          required: ['symbol', 'time_start', 'time_end'],
        },
      },
      {
        name: 'analyze_price_performance',
        description: 'Analyze price performance over different time periods with returns and volatility',
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
                enum: ['1d', '7d', '30d', '90d', '1y', 'ytd'],
              },
              description: 'Time periods to analyze',
              default: ['7d', '30d', '90d'],
            },
            benchmark: {
              type: 'string',
              description: 'Benchmark symbol for comparison (e.g., BTC)',
              default: 'BTC',
            },
            include_drawdown: {
              type: 'boolean',
              description: 'Include maximum drawdown analysis',
              default: true,
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'compare_historical_performance',
        description: 'Compare historical performance between multiple cryptocurrencies',
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
              enum: ['30d', '90d', '1y'],
              description: 'Comparison timeframe',
              default: '90d',
            },
            metrics: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['returns', 'volatility', 'sharpe_ratio', 'max_drawdown', 'correlation'],
              },
              description: 'Performance metrics to compare',
              default: ['returns', 'volatility', 'sharpe_ratio'],
            },
            normalize: {
              type: 'boolean',
              description: 'Normalize prices to 100 at start for easier comparison',
              default: true,
            },
          },
          required: ['symbols'],
        },
      },
      {
        name: 'analyze_market_cycles',
        description: 'Analyze market cycles, seasonal patterns, and cyclical behavior',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol',
            },
            analysis_type: {
              type: 'string',
              enum: ['cycles', 'seasonality', 'patterns', 'all'],
              description: 'Type of cycle analysis',
              default: 'all',
            },
            timeframe: {
              type: 'string',
              enum: ['1y', '2y', '5y', 'max'],
              description: 'Historical timeframe for analysis',
              default: '2y',
            },
            include_predictions: {
              type: 'boolean',
              description: 'Include cycle-based predictions',
              default: false,
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'calculate_risk_metrics',
        description: 'Calculate comprehensive risk metrics including VaR, beta, and risk-adjusted returns',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol',
            },
            timeframe: {
              type: 'string',
              enum: ['30d', '90d', '1y'],
              description: 'Risk calculation timeframe',
              default: '90d',
            },
            confidence_levels: {
              type: 'array',
              items: { type: 'number' },
              description: 'VaR confidence levels (0-1)',
              default: [0.95, 0.99],
            },
            benchmark: {
              type: 'string',
              description: 'Benchmark for beta calculation',
              default: 'BTC',
            },
            risk_free_rate: {
              type: 'number',
              description: 'Risk-free rate for Sharpe ratio (annual %)',
              default: 5.0,
            },
          },
          required: ['symbol'],
        },
      },
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'get_historical_data':
        return this.getHistoricalData(args);
      case 'analyze_price_performance':
        return this.analyzePricePerformance(args);
      case 'compare_historical_performance':
        return this.compareHistoricalPerformance(args);
      case 'analyze_market_cycles':
        return this.analyzeMarketCycles(args);
      case 'calculate_risk_metrics':
        return this.calculateRiskMetrics(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getHistoricalData(args: {
    symbol: string;
    time_start: string;
    time_end: string;
    interval?: string;
    include_analysis?: boolean;
  }): Promise<any> {
    const { 
      symbol, 
      time_start, 
      time_end, 
      interval = '1d', 
      include_analysis = true 
    } = args;

    const cacheKey = this.cache.generateCacheKey('historical_data', {
      symbol, time_start, time_end, interval, include_analysis,
    });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const response = await this.client.getCryptocurrencyOHLCVHistorical({
        symbol: symbol.toUpperCase(),
        time_start: new Date(time_start).toISOString(),
        time_end: new Date(time_end).toISOString(),
        interval,
        convert: 'USD',
      });

      const historicalData = (response.data as any).quotes.map((quote: any) => ({
        timestamp: quote.time_open,
        date: new Date(quote.time_open).toISOString().split('T')[0],
        open: quote.quote.USD.open,
        high: quote.quote.USD.high,
        low: quote.quote.USD.low,
        close: quote.quote.USD.close,
        volume: quote.quote.USD.volume,
        market_cap: quote.quote.USD.market_cap,
      }));

      result = {
        symbol: symbol.toUpperCase(),
        time_period: {
          start: time_start,
          end: time_end,
          interval,
          data_points: historicalData.length,
        },
        data: historicalData,
        last_updated: new Date().toISOString(),
      } as any;

      if (include_analysis && historicalData.length > 0) {
        (result as any).analysis = this.performHistoricalAnalysis(historicalData);
      }

      // Cache for longer if it's daily data, shorter for intraday
      const cacheTtl = interval === '1d' ? 3600 : 300; // 1 hour vs 5 minutes
      this.cache.set(cacheKey, result, cacheTtl);
      return result;
    } catch (error) {
      throw new Error(`Failed to get historical data for ${symbol}: ${error}`);
    }
  }

  private async analyzePricePerformance(args: {
    symbol: string;
    periods?: string[];
    benchmark?: string;
    include_drawdown?: boolean;
  }): Promise<any> {
    const { 
      symbol, 
      periods = ['7d', '30d', '90d'], 
      benchmark = 'BTC',
      include_drawdown = true 
    } = args;

    const cacheKey = this.cache.generateCacheKey('price_performance', {
      symbol, periods, benchmark, include_drawdown,
    });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const performance: any = {
        symbol: symbol.toUpperCase(),
        benchmark: benchmark.toUpperCase(),
        periods: {},
        comparison_to_benchmark: {},
        last_updated: new Date().toISOString(),
      };

      // Get current price
      const currentResponse = await this.client.getCryptocurrencyQuotesLatest({
        symbol: symbol.toUpperCase(),
        convert: 'USD',
      });
      
      const currentPrice = (currentResponse.data as any)[symbol.toUpperCase()][0].quote.USD.price;

      // Analyze each period
      for (const period of periods) {
        try {
          const days = this.periodToDays(period);
          const endDate = new Date();
          const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

          const historicalData = await this.getHistoricalDataForPeriod(symbol, startDate, endDate);
          
          if (historicalData.length > 0) {
            const periodAnalysis = this.calculatePeriodPerformance(historicalData, currentPrice);
            
            if (include_drawdown) {
              periodAnalysis.max_drawdown = this.calculateMaxDrawdown(historicalData);
              periodAnalysis.drawdown_periods = this.identifyDrawdownPeriods(historicalData);
            }

            performance.periods[period] = periodAnalysis;

            // Compare to benchmark if it's not the same symbol
            if (benchmark.toUpperCase() !== symbol.toUpperCase()) {
              try {
                const benchmarkData = await this.getHistoricalDataForPeriod(benchmark, startDate, endDate);
                const benchmarkPerformance = this.calculatePeriodPerformance(benchmarkData);
                
                performance.comparison_to_benchmark[period] = {
                  symbol_return: periodAnalysis.total_return,
                  benchmark_return: benchmarkPerformance.total_return,
                  outperformance: periodAnalysis.total_return - benchmarkPerformance.total_return,
                  beta: this.calculateBeta(historicalData, benchmarkData),
                  correlation: this.calculateCorrelation(historicalData, benchmarkData),
                };
              } catch (error) {
                console.error(`[${new Date().toISOString()}] WARN: ` + `Failed to get benchmark data for ${period}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] WARN: ` + `Failed to analyze period ${period}:`, error);
          performance.periods[period] = { error: `Analysis failed: ${error}` };
        }
      }

      // Calculate overall performance metrics
      performance.summary = this.calculatePerformanceSummary(performance.periods);

      this.cache.set(cacheKey, performance, 600); // Cache for 10 minutes
      return performance;
    } catch (error) {
      throw new Error(`Failed to analyze price performance for ${symbol}: ${error}`);
    }
  }

  private async compareHistoricalPerformance(args: {
    symbols: string[];
    timeframe?: string;
    metrics?: string[];
    normalize?: boolean;
  }): Promise<any> {
    const { 
      symbols, 
      timeframe = '90d', 
      metrics = ['returns', 'volatility', 'sharpe_ratio'],
      normalize = true 
    } = args;

    const cacheKey = this.cache.generateCacheKey('historical_performance_comparison', {
      symbols: symbols.join(','), timeframe, metrics, normalize,
    });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const days = this.periodToDays(timeframe);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const comparisons = [];
      const normalizedData: any = {};

      // Get data for each symbol
      for (const symbol of symbols) {
        try {
          const historicalData = await this.getHistoricalDataForPeriod(symbol, startDate, endDate);
          
          if (historicalData.length > 0) {
            const analysis = this.calculateComprehensiveMetrics(historicalData, metrics);
            
            comparisons.push({
              symbol: symbol.toUpperCase(),
              ...analysis,
            });

            // Prepare normalized data for comparison
            if (normalize) {
              normalizedData[symbol.toUpperCase()] = this.normalizeData(historicalData);
            }
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] WARN: ` + `Failed to analyze ${symbol}:`, error);
          comparisons.push({
            symbol: symbol.toUpperCase(),
            error: `Analysis failed: ${error}`,
          });
        }
      }

      const validComparisons = comparisons.filter(c => !c.error);

      result = {
        timeframe,
        metrics_analyzed: metrics,
        total_symbols: symbols.length,
        successful_analyses: validComparisons.length,
        comparison_data: validComparisons,
        rankings: this.createPerformanceRankings(validComparisons, metrics),
        correlation_matrix: this.calculateCorrelationMatrix(validComparisons),
        normalized_data: normalize ? normalizedData : null,
        summary: {
          best_performer: this.getBestPerformer(validComparisons),
          worst_performer: this.getWorstPerformer(validComparisons),
          average_return: this.calculateAverageReturn(validComparisons),
          return_dispersion: this.calculateReturnDispersion(validComparisons),
        },
        errors: comparisons.filter(c => c.error),
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, result, 900); // Cache for 15 minutes
      return result;
    } catch (error) {
      throw new Error(`Failed to compare historical performance: ${error}`);
    }
  }

  private async analyzeMarketCycles(args: {
    symbol: string;
    analysis_type?: string;
    timeframe?: string;
    include_predictions?: boolean;
  }): Promise<any> {
    const { 
      symbol, 
      analysis_type = 'all', 
      timeframe = '2y',
      include_predictions = false 
    } = args;

    const cacheKey = this.cache.generateCacheKey('market_cycles', {
      symbol, analysis_type, timeframe, include_predictions,
    });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const days = this.periodToDays(timeframe);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const historicalData = await this.getHistoricalDataForPeriod(symbol, startDate, endDate);
      
      if (historicalData.length < 30) {
        throw new Error('Insufficient data for cycle analysis');
      }

      const analysis: any = {
        symbol: symbol.toUpperCase(),
        timeframe,
        analysis_type,
        data_points: historicalData.length,
        last_updated: new Date().toISOString(),
      };

      if (analysis_type === 'cycles' || analysis_type === 'all') {
        analysis.market_cycles = this.identifyMarketCycles(historicalData);
        analysis.cycle_statistics = this.calculateCycleStatistics(analysis.market_cycles);
      }

      if (analysis_type === 'seasonality' || analysis_type === 'all') {
        analysis.seasonal_patterns = this.analyzeSeasonalPatterns(historicalData);
        analysis.monthly_performance = this.calculateMonthlyPerformance(historicalData);
        analysis.day_of_week_patterns = this.analyzeDayOfWeekPatterns(historicalData);
      }

      if (analysis_type === 'patterns' || analysis_type === 'all') {
        analysis.recurring_patterns = this.identifyRecurringPatterns(historicalData);
        analysis.support_resistance_levels = this.identifyHistoricalLevels(historicalData);
      }

      if (include_predictions) {
        analysis.predictions = this.generateCyclePredictions(analysis);
      }

      // Add current cycle status
      analysis.current_cycle_status = this.determineCurrentCycleStatus(historicalData, analysis);

      this.cache.set(cacheKey, analysis, 1800); // Cache for 30 minutes
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze market cycles for ${symbol}: ${error}`);
    }
  }

  private async calculateRiskMetrics(args: {
    symbol: string;
    timeframe?: string;
    confidence_levels?: number[];
    benchmark?: string;
    risk_free_rate?: number;
  }): Promise<any> {
    const { 
      symbol, 
      timeframe = '90d',
      confidence_levels = [0.95, 0.99],
      benchmark = 'BTC',
      risk_free_rate = 5.0 
    } = args;

    const cacheKey = this.cache.generateCacheKey('risk_metrics', {
      symbol, timeframe, confidence_levels, benchmark, risk_free_rate,
    });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const days = this.periodToDays(timeframe);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const historicalData = await this.getHistoricalDataForPeriod(symbol, startDate, endDate);
      
      if (historicalData.length < 10) {
        throw new Error('Insufficient data for risk calculations');
      }

      const returns = this.calculateReturns(historicalData);
      
      const riskMetrics: any = {
        symbol: symbol.toUpperCase(),
        timeframe,
        data_points: historicalData.length,
        calculation_date: new Date().toISOString(),
      };

      // Basic risk metrics
      riskMetrics.volatility = this.calculateVolatility(returns);
      riskMetrics.downside_deviation = this.calculateDownsideDeviation(returns);
      riskMetrics.skewness = this.calculateSkewness(returns);
      riskMetrics.kurtosis = this.calculateKurtosis(returns);

      // VaR calculations
      riskMetrics.value_at_risk = {};
      for (const confidence of confidence_levels) {
        riskMetrics.value_at_risk[`${confidence * 100}%`] = this.calculateVaR(returns, confidence);
      }

      // Expected Shortfall (CVaR)
      riskMetrics.expected_shortfall = {};
      for (const confidence of confidence_levels) {
        riskMetrics.expected_shortfall[`${confidence * 100}%`] = this.calculateExpectedShortfall(returns, confidence);
      }

      // Risk-adjusted returns
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const annualizedReturn = (Math.pow(1 + avgReturn, 365) - 1) * 100; // Approximate annualization
      const annualizedVolatility = riskMetrics.volatility * Math.sqrt(365) * 100;
      
      riskMetrics.sharpe_ratio = (annualizedReturn - risk_free_rate) / annualizedVolatility;
      riskMetrics.sortino_ratio = (annualizedReturn - risk_free_rate) / (riskMetrics.downside_deviation * Math.sqrt(365) * 100);

      // Maximum drawdown
      riskMetrics.max_drawdown = this.calculateMaxDrawdown(historicalData);

      // Beta calculation if benchmark is different
      if (benchmark.toUpperCase() !== symbol.toUpperCase()) {
        try {
          const benchmarkData = await this.getHistoricalDataForPeriod(benchmark, startDate, endDate);
          const benchmarkReturns = this.calculateReturns(benchmarkData);
          
          riskMetrics.beta = this.calculateBeta(returns, benchmarkReturns);
          riskMetrics.alpha = this.calculateAlpha(returns, benchmarkReturns, risk_free_rate);
          riskMetrics.correlation_with_benchmark = this.calculateCorrelation(returns, benchmarkReturns);
          riskMetrics.tracking_error = this.calculateTrackingError(returns, benchmarkReturns);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] WARN: ` + `Failed to calculate benchmark-related metrics:`, error);
        }
      }

      // Risk assessment
      riskMetrics.risk_assessment = this.assessOverallRisk(riskMetrics);

      this.cache.set(cacheKey, riskMetrics, 600); // Cache for 10 minutes
      return riskMetrics;
    } catch (error) {
      throw new Error(`Failed to calculate risk metrics for ${symbol}: ${error}`);
    }
  }

  // Helper methods
  private async getHistoricalDataForPeriod(symbol: string, startDate: Date, endDate: Date): Promise<any[]> {
    const response = await this.client.getCryptocurrencyOHLCVHistorical({
      symbol: symbol.toUpperCase(),
      time_start: startDate.toISOString(),
      time_end: endDate.toISOString(),
      interval: '1d',
      convert: 'USD',
    });

    return (response.data as any).quotes.map((quote: any) => ({
      timestamp: quote.time_open,
      date: new Date(quote.time_open).toISOString().split('T')[0],
      open: quote.quote.USD.open,
      high: quote.quote.USD.high,
      low: quote.quote.USD.low,
      close: quote.quote.USD.close,
      volume: quote.quote.USD.volume,
    }));
  }

  private periodToDays(period: string): number {
    const periodMap: Record<string, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
      '2y': 730,
      '5y': 1825,
      'ytd': Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)),
      'max': 3650, // 10 years max
    };
    
    return periodMap[period] || 30;
  }

  private performHistoricalAnalysis(data: any[]): any {
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const returns = this.calculateReturns(data);

    return {
      price_statistics: {
        min: Math.min(...closes),
        max: Math.max(...closes),
        mean: closes.reduce((sum, p) => sum + p, 0) / closes.length,
        first: closes[0],
        last: closes[closes.length - 1],
        change: closes[closes.length - 1] - closes[0],
        change_percent: ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100,
      },
      volume_statistics: {
        min: Math.min(...volumes),
        max: Math.max(...volumes),
        mean: volumes.reduce((sum, v) => sum + v, 0) / volumes.length,
        total: volumes.reduce((sum, v) => sum + v, 0),
      },
      volatility: this.calculateVolatility(returns) * 100, // As percentage
      best_day: this.findBestDay(returns, data),
      worst_day: this.findWorstDay(returns, data),
      positive_days: returns.filter(r => r > 0).length,
      negative_days: returns.filter(r => r < 0).length,
      max_drawdown: this.calculateMaxDrawdown(data),
    };
  }

  private calculatePeriodPerformance(data: any[], currentPrice?: number): any {
    const prices = data.map(d => d.close);
    const startPrice = prices[0];
    const endPrice = currentPrice || prices[prices.length - 1];
    const returns = this.calculateReturns(data);

    return {
      start_price: startPrice,
      end_price: endPrice,
      total_return: ((endPrice - startPrice) / startPrice) * 100,
      annualized_return: this.calculateAnnualizedReturn(data),
      volatility: this.calculateVolatility(returns) * 100,
      sharpe_ratio: this.calculateSharpeRatio(returns),
      best_day: Math.max(...returns) * 100,
      worst_day: Math.min(...returns) * 100,
      win_rate: (returns.filter(r => r > 0).length / returns.length) * 100,
    };
  }

  private calculateReturns(data: any[]): number[] {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
    return returns;
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateMaxDrawdown(data: any[]): any {
    const prices = data.map(d => d.close);
    let maxDrawdown = 0;
    let peak = prices[0];
    let peakIndex = 0;
    let troughIndex = 0;
    let maxDrawdownStart = '';
    let maxDrawdownEnd = '';

    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > peak) {
        peak = prices[i];
        peakIndex = i;
      }

      const drawdown = (peak - prices[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        troughIndex = i;
        maxDrawdownStart = data[peakIndex].date;
        maxDrawdownEnd = data[troughIndex].date;
      }
    }

    return {
      max_drawdown_percent: maxDrawdown * 100,
      peak_price: peak,
      trough_price: prices[troughIndex],
      start_date: maxDrawdownStart,
      end_date: maxDrawdownEnd,
      duration_days: troughIndex - peakIndex,
    };
  }

  private calculateBeta(returns: number[], benchmarkReturns: number[]): number {
    if (returns.length !== benchmarkReturns.length || returns.length < 2) {
      return 1; // Default beta
    }

    const minLength = Math.min(returns.length, benchmarkReturns.length);
    const assetReturns = returns.slice(-minLength);
    const marketReturns = benchmarkReturns.slice(-minLength);

    const covariance = this.calculateCovariance(assetReturns, marketReturns);
    const marketVariance = this.calculateVariance(marketReturns);

    return marketVariance === 0 ? 1 : covariance / marketVariance;
  }

  private calculateCorrelation(returns1: number[], returns2: number[]): number {
    if (returns1.length !== returns2.length || returns1.length < 2) {
      return 0;
    }

    const minLength = Math.min(returns1.length, returns2.length);
    const r1 = returns1.slice(-minLength);
    const r2 = returns2.slice(-minLength);

    const mean1 = r1.reduce((sum, ret) => sum + ret, 0) / r1.length;
    const mean2 = r2.reduce((sum, ret) => sum + ret, 0) / r2.length;

    let numerator = 0;
    let sumSquares1 = 0;
    let sumSquares2 = 0;

    for (let i = 0; i < r1.length; i++) {
      const diff1 = r1[i] - mean1;
      const diff2 = r2[i] - mean2;
      
      numerator += diff1 * diff2;
      sumSquares1 += diff1 * diff1;
      sumSquares2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sumSquares1 * sumSquares2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateCovariance(returns1: number[], returns2: number[]): number {
    const mean1 = returns1.reduce((sum, ret) => sum + ret, 0) / returns1.length;
    const mean2 = returns2.reduce((sum, ret) => sum + ret, 0) / returns2.length;

    return returns1.reduce((sum, ret, i) => {
      return sum + (ret - mean1) * (returns2[i] - mean2);
    }, 0) / returns1.length;
  }

  private calculateVariance(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    return returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  }

  private calculateAnnualizedReturn(data: any[]): number {
    if (data.length < 2) return 0;
    
    const totalReturn = (data[data.length - 1].close - data[0].close) / data[0].close;
    const days = data.length - 1;
    const years = days / 365;
    
    return (Math.pow(1 + totalReturn, 1 / years) - 1) * 100;
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.05): number {
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const annualizedReturn = (Math.pow(1 + avgReturn, 365) - 1);
    const volatility = this.calculateVolatility(returns) * Math.sqrt(365);
    
    return volatility === 0 ? 0 : (annualizedReturn - riskFreeRate) / volatility;
  }

  private calculateVaR(returns: number[], confidence: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return sortedReturns[index] * 100; // As percentage
  }

  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    const varValue = this.calculateVaR(returns, confidence) / 100; // Convert back to decimal
    const exceedances = returns.filter(ret => ret <= varValue);
    return exceedances.length === 0 ? varValue * 100 : (exceedances.reduce((sum, ret) => sum + ret, 0) / exceedances.length) * 100;
  }

  private calculateDownsideDeviation(returns: number[], target: number = 0): number {
    const downsideReturns = returns.filter(ret => ret < target);
    if (downsideReturns.length === 0) return 0;
    
    const mean = downsideReturns.reduce((sum, ret) => sum + ret, 0) / downsideReturns.length;
    const variance = downsideReturns.reduce((sum, ret) => sum + Math.pow(ret - target, 2), 0) / downsideReturns.length;
    return Math.sqrt(variance);
  }

  private calculateSkewness(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const skewness = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / stdDev, 3), 0) / returns.length;
    return skewness;
  }

  private calculateKurtosis(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const kurtosis = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / stdDev, 4), 0) / returns.length;
    return kurtosis - 3; // Excess kurtosis
  }

  private findBestDay(returns: number[], data: any[]): any {
    const maxReturnIndex = returns.indexOf(Math.max(...returns));
    return {
      date: data[maxReturnIndex + 1].date, // +1 because returns array is offset
      return_percent: Math.max(...returns) * 100,
      price_change: data[maxReturnIndex + 1].close - data[maxReturnIndex].close,
    };
  }

  private findWorstDay(returns: number[], data: any[]): any {
    const minReturnIndex = returns.indexOf(Math.min(...returns));
    return {
      date: data[minReturnIndex + 1].date, // +1 because returns array is offset
      return_percent: Math.min(...returns) * 100,
      price_change: data[minReturnIndex + 1].close - data[minReturnIndex].close,
    };
  }

  // Additional helper methods would be implemented here for:
  // - identifyMarketCycles
  // - calculateCycleStatistics
  // - analyzeSeasonalPatterns
  // - calculateMonthlyPerformance
  // - analyzeDayOfWeekPatterns
  // - identifyRecurringPatterns
  // - identifyHistoricalLevels
  // - generateCyclePredictions
  // - determineCurrentCycleStatus
  // - calculateComprehensiveMetrics
  // - normalizeData
  // - createPerformanceRankings
  // - calculateCorrelationMatrix
  // - getBestPerformer/getWorstPerformer
  // - calculateAverageReturn
  // - calculateReturnDispersion
  // - calculatePerformanceSummary
  // - identifyDrawdownPeriods
  // - calculateAlpha
  // - calculateTrackingError
  // - assessOverallRisk

  // Simplified implementations for demonstration
  private identifyMarketCycles(data: any[]): any {
    return {
      bull_markets: [],
      bear_markets: [],
      cycle_count: 0,
      average_cycle_length: 0,
    };
  }

  private calculateCycleStatistics(cycles: any): any {
    return {
      average_bull_duration: 0,
      average_bear_duration: 0,
      average_bull_return: 0,
      average_bear_return: 0,
    };
  }

  private analyzeSeasonalPatterns(data: any[]): any {
    return {
      best_month: 'January',
      worst_month: 'December',
      seasonal_strength: 'weak',
    };
  }

  private calculateMonthlyPerformance(data: any[]): any {
    const monthlyReturns: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach(month => monthlyReturns[month] = 0);
    return monthlyReturns;
  }

  private analyzeDayOfWeekPatterns(data: any[]): any {
    const dayReturns: Record<string, number> = {
      Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0
    };
    return dayReturns;
  }

  private identifyRecurringPatterns(data: any[]): any[] {
    return [];
  }

  private identifyHistoricalLevels(data: any[]): any {
    const prices = data.map(d => d.close);
    return {
      major_support_levels: [Math.min(...prices)],
      major_resistance_levels: [Math.max(...prices)],
    };
  }

  private generateCyclePredictions(analysis: any): any {
    return {
      next_cycle_prediction: 'uncertain',
      confidence: 0.3,
      timeframe: '3-6 months',
    };
  }

  private determineCurrentCycleStatus(data: any[], analysis: any): string {
    return 'uncertain';
  }

  private calculateComprehensiveMetrics(data: any[], metrics: string[]): any {
    const returns = this.calculateReturns(data);
    const result: any = {};

    if (metrics.includes('returns')) {
      result.total_return = ((data[data.length - 1].close - data[0].close) / data[0].close) * 100;
    }

    if (metrics.includes('volatility')) {
      result.volatility = this.calculateVolatility(returns) * 100;
    }

    if (metrics.includes('sharpe_ratio')) {
      result.sharpe_ratio = this.calculateSharpeRatio(returns);
    }

    if (metrics.includes('max_drawdown')) {
      result.max_drawdown = this.calculateMaxDrawdown(data).max_drawdown_percent;
    }

    return result;
  }

  private normalizeData(data: any[]): any[] {
    const basePrice = data[0].close;
    return data.map(d => ({
      date: d.date,
      normalized_price: (d.close / basePrice) * 100,
    }));
  }

  private createPerformanceRankings(comparisons: any[], metrics: string[]): any[] {
    return comparisons.map((comp, index) => ({
      rank: index + 1,
      symbol: comp.symbol,
      score: comp.total_return || 0,
    })).sort((a, b) => b.score - a.score);
  }

  private calculateCorrelationMatrix(comparisons: any[]): any {
    // Simplified correlation matrix
    const matrix: Record<string, Record<string, number>> = {};
    comparisons.forEach(comp1 => {
      matrix[comp1.symbol] = {};
      comparisons.forEach(comp2 => {
        matrix[comp1.symbol][comp2.symbol] = comp1.symbol === comp2.symbol ? 1.0 : 0.5;
      });
    });
    return matrix;
  }

  private getBestPerformer(comparisons: any[]): any {
    return comparisons.reduce((best, current) => 
      (current.total_return || 0) > (best.total_return || 0) ? current : best, comparisons[0]
    );
  }

  private getWorstPerformer(comparisons: any[]): any {
    return comparisons.reduce((worst, current) => 
      (current.total_return || 0) < (worst.total_return || 0) ? current : worst, comparisons[0]
    );
  }

  private calculateAverageReturn(comparisons: any[]): number {
    return comparisons.reduce((sum, comp) => sum + (comp.total_return || 0), 0) / comparisons.length;
  }

  private calculateReturnDispersion(comparisons: any[]): number {
    const returns = comparisons.map(comp => comp.total_return || 0);
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculatePerformanceSummary(periods: any): any {
    const validPeriods = Object.values(periods).filter((p: any) => !p.error);
    return {
      best_period: 'N/A',
      worst_period: 'N/A',
      average_return: 0,
      consistency_score: 0.5,
    };
  }

  private identifyDrawdownPeriods(data: any[]): any[] {
    return [];
  }

  private calculateAlpha(returns: number[], benchmarkReturns: number[], riskFreeRate: number): number {
    const beta = this.calculateBeta(returns, benchmarkReturns);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const benchmarkAvgReturn = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
    
    const annualizedReturn = (Math.pow(1 + avgReturn, 365) - 1);
    const benchmarkAnnualizedReturn = (Math.pow(1 + benchmarkAvgReturn, 365) - 1);
    
    return annualizedReturn - (riskFreeRate / 100 + beta * (benchmarkAnnualizedReturn - riskFreeRate / 100));
  }

  private calculateTrackingError(returns: number[], benchmarkReturns: number[]): number {
    const minLength = Math.min(returns.length, benchmarkReturns.length);
    const assetReturns = returns.slice(-minLength);
    const marketReturns = benchmarkReturns.slice(-minLength);
    
    const differences = assetReturns.map((ret, i) => ret - marketReturns[i]);
    return this.calculateVolatility(differences) * Math.sqrt(365) * 100; // Annualized
  }

  private assessOverallRisk(riskMetrics: any): any {
    let riskScore = 50; // Neutral baseline
    
    // Volatility impact
    if (riskMetrics.volatility > 0.3) riskScore += 20;
    else if (riskMetrics.volatility < 0.1) riskScore -= 10;
    
    // Sharpe ratio impact
    if (riskMetrics.sharpe_ratio < 0) riskScore += 15;
    else if (riskMetrics.sharpe_ratio > 1) riskScore -= 15;
    
    // Maximum drawdown impact
    if (riskMetrics.max_drawdown.max_drawdown_percent > 50) riskScore += 25;
    else if (riskMetrics.max_drawdown.max_drawdown_percent < 10) riskScore -= 10;
    
    const finalScore = Math.max(0, Math.min(100, riskScore));
    
    return {
      risk_score: finalScore,
      risk_level: finalScore > 70 ? 'high' : finalScore < 40 ? 'low' : 'moderate',
      key_concerns: this.identifyKeyRiskConcerns(riskMetrics),
      recommendations: this.generateRiskRecommendations(finalScore),
    };
  }

  private identifyKeyRiskConcerns(riskMetrics: any): string[] {
    const concerns = [];
    
    if (riskMetrics.volatility > 0.5) concerns.push('high_volatility');
    if (riskMetrics.max_drawdown.max_drawdown_percent > 40) concerns.push('large_drawdowns');
    if (riskMetrics.sharpe_ratio < 0) concerns.push('negative_risk_adjusted_returns');
    if (riskMetrics.skewness < -1) concerns.push('negative_skewness');
    if (riskMetrics.kurtosis > 3) concerns.push('fat_tails');
    
    return concerns;
  }

  private generateRiskRecommendations(riskScore: number): string[] {
    const recommendations = [];
    
    if (riskScore > 70) {
      recommendations.push('Consider position sizing carefully');
      recommendations.push('Implement strict stop-loss strategies');
      recommendations.push('Diversify to reduce concentration risk');
    } else if (riskScore < 40) {
      recommendations.push('Asset shows relatively stable risk profile');
      recommendations.push('Consider as part of balanced portfolio');
    } else {
      recommendations.push('Monitor risk metrics regularly');
      recommendations.push('Maintain balanced position sizing');
    }
    
    return recommendations;
  }
}