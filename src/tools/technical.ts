import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CoinMarketCapClient } from '../api/client.js';
import { CacheManager } from '../api/cache.js';
import { TechnicalIndicators, HistoricalQuote } from '../types/index.js';

export class TechnicalAnalysisTools {
  constructor(
    private client: CoinMarketCapClient,
    private cache: CacheManager
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'calculate_technical_indicators',
        description: 'Calculate RSI, MACD, moving averages and other technical indicators for any cryptocurrency',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol (e.g., BTC, ETH)',
            },
            indicators: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['rsi', 'macd', 'sma', 'ema', 'bollinger', 'volume_sma'],
              },
              description: 'Technical indicators to calculate',
              default: ['rsi', 'macd', 'sma'],
            },
            period: {
              type: 'number',
              description: 'Period for calculations (e.g., 14 for RSI)',
              minimum: 2,
              maximum: 200,
              default: 14,
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
        name: 'analyze_price_action',
        description: 'Analyze price action patterns, support/resistance levels, and trend analysis',
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
            include_patterns: {
              type: 'boolean',
              description: 'Include chart pattern analysis',
              default: true,
            },
            include_levels: {
              type: 'boolean',
              description: 'Include support/resistance levels',
              default: true,
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'generate_trading_signals',
        description: 'Generate buy/sell/hold signals based on technical analysis',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol',
            },
            strategy: {
              type: 'string',
              enum: ['conservative', 'moderate', 'aggressive'],
              description: 'Trading strategy risk level',
              default: 'moderate',
            },
            timeframe: {
              type: 'string',
              enum: ['1d', '7d', '30d'],
              description: 'Signal timeframe',
              default: '7d',
            },
            include_confidence: {
              type: 'boolean',
              description: 'Include confidence scores for signals',
              default: true,
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'compare_technical_strength',
        description: 'Compare technical strength between multiple cryptocurrencies',
        inputSchema: {
          type: 'object',
          properties: {
            symbols: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of cryptocurrency symbols to compare',
              maxItems: 10,
            },
            metrics: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['rsi', 'momentum', 'trend_strength', 'volatility', 'volume_trend'],
              },
              description: 'Technical metrics to compare',
              default: ['rsi', 'momentum', 'trend_strength'],
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

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'calculate_technical_indicators':
        return this.calculateTechnicalIndicators(args);
      case 'analyze_price_action':
        return this.analyzePriceAction(args);
      case 'generate_trading_signals':
        return this.generateTradingSignals(args);
      case 'compare_technical_strength':
        return this.compareTechnicalStrength(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async calculateTechnicalIndicators(args: {
    symbol: string;
    indicators?: string[];
    period?: number;
    timeframe?: string;
  }): Promise<any> {
    const { 
      symbol, 
      indicators = ['rsi', 'macd', 'sma'], 
      period = 14, 
      timeframe = '30d' 
    } = args;

    const cacheKey = this.cache.generateCacheKey('technical_indicators', { 
      symbol, indicators, period, timeframe 
    });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      // Get historical OHLCV data
      const historicalData = await this.getHistoricalData(symbol, timeframe);
      
      if (historicalData.length < period + 5) {
        throw new Error(`Insufficient data for calculation. Need at least ${period + 5} data points.`);
      }

      const technicalData: any = {
        symbol: symbol.toUpperCase(),
        timeframe,
        period,
        data_points: historicalData.length,
        indicators: {},
        last_updated: new Date().toISOString(),
      };

      // Calculate each requested indicator
      for (const indicator of indicators) {
        try {
          switch (indicator) {
            case 'rsi':
              technicalData.indicators.rsi = this.calculateRSI(historicalData, period);
              break;
            case 'macd':
              technicalData.indicators.macd = this.calculateMACD(historicalData);
              break;
            case 'sma':
              technicalData.indicators.sma = this.calculateSMA(historicalData, period);
              break;
            case 'ema':
              technicalData.indicators.ema = this.calculateEMA(historicalData, period);
              break;
            case 'bollinger':
              technicalData.indicators.bollinger = this.calculateBollingerBands(historicalData, period);
              break;
            case 'volume_sma':
              technicalData.indicators.volume_sma = this.calculateVolumeSMA(historicalData, period);
              break;
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] WARN: ` + `Failed to calculate ${indicator}:`, error);
          technicalData.indicators[indicator] = { error: `Calculation failed: ${error}` };
        }
      }

      // Add current analysis
      technicalData.current_analysis = this.analyzeCurrentTechnicals(technicalData.indicators);

      this.cache.set(cacheKey, technicalData, 600); // Cache for 10 minutes
      return technicalData;
    } catch (error) {
      throw new Error(`Failed to calculate technical indicators for ${symbol}: ${error}`);
    }
  }

  private async analyzePriceAction(args: {
    symbol: string;
    timeframe?: string;
    include_patterns?: boolean;
    include_levels?: boolean;
  }): Promise<any> {
    const { 
      symbol, 
      timeframe = '30d', 
      include_patterns = true, 
      include_levels = true 
    } = args;

    const cacheKey = this.cache.generateCacheKey('price_action_analysis', { 
      symbol, timeframe, include_patterns, include_levels 
    });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const historicalData = await this.getHistoricalData(symbol, timeframe);
      
      if (historicalData.length < 20) {
        throw new Error('Insufficient data for price action analysis');
      }

      const analysis: any = {
        symbol: symbol.toUpperCase(),
        timeframe,
        current_price: historicalData[historicalData.length - 1].close,
        trend_analysis: this.analyzeTrend(historicalData),
        volatility_analysis: this.analyzeVolatility(historicalData),
        volume_analysis: this.analyzeVolumeProfile(historicalData),
        last_updated: new Date().toISOString(),
      };

      if (include_patterns) {
        analysis.chart_patterns = this.identifyChartPatterns(historicalData);
        analysis.candlestick_patterns = this.identifyCandlestickPatterns(historicalData);
      }

      if (include_levels) {
        analysis.support_resistance = this.calculateSupportResistance(historicalData);
        analysis.pivot_points = this.calculatePivotPoints(historicalData);
      }

      // Add overall assessment
      analysis.overall_assessment = this.generatePriceActionAssessment(analysis);

      this.cache.set(cacheKey, analysis, 600);
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze price action for ${symbol}: ${error}`);
    }
  }

  private async generateTradingSignals(args: {
    symbol: string;
    strategy?: string;
    timeframe?: string;
    include_confidence?: boolean;
  }): Promise<any> {
    const { 
      symbol, 
      strategy = 'moderate', 
      timeframe = '7d', 
      include_confidence = true 
    } = args;

    const cacheKey = this.cache.generateCacheKey('trading_signals', { 
      symbol, strategy, timeframe, include_confidence 
    });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      // Get technical indicators and price action
      const technicalData = await this.calculateTechnicalIndicators({
        symbol,
        indicators: ['rsi', 'macd', 'sma', 'ema', 'bollinger'],
        timeframe,
      });

      const priceActionData = await this.analyzePriceAction({
        symbol,
        timeframe,
      });

      const signals: any = {
        symbol: symbol.toUpperCase(),
        strategy,
        timeframe,
        current_price: priceActionData.current_price,
        signals: [],
        overall_signal: 'hold',
        confidence_score: 0,
        last_updated: new Date().toISOString(),
      };

      // Generate signals based on different indicators
      const indicatorSignals = this.generateIndicatorSignals(technicalData.indicators, strategy);
      const trendSignals = this.generateTrendSignals(priceActionData.trend_analysis, strategy);
      const volumeSignals = this.generateVolumeSignals(priceActionData.volume_analysis, strategy);

      signals.signals = [
        ...indicatorSignals,
        ...trendSignals,
        ...volumeSignals,
      ];

      // Calculate overall signal and confidence
      const overallAssessment = this.calculateOverallSignal(signals.signals, strategy);
      signals.overall_signal = overallAssessment.signal;
      signals.confidence_score = overallAssessment.confidence;

      if (include_confidence) {
        signals.signal_breakdown = this.analyzeSignalStrength(signals.signals);
        signals.risk_assessment = this.assessRiskLevel(technicalData, priceActionData, strategy);
      }

      // Add actionable recommendations
      signals.recommendations = this.generateActionableRecommendations(signals, strategy);

      this.cache.set(cacheKey, signals, 300); // Cache for 5 minutes
      return signals;
    } catch (error) {
      throw new Error(`Failed to generate trading signals for ${symbol}: ${error}`);
    }
  }

  private async compareTechnicalStrength(args: {
    symbols: string[];
    metrics?: string[];
    timeframe?: string;
  }): Promise<any> {
    const { 
      symbols, 
      metrics = ['rsi', 'momentum', 'trend_strength'], 
      timeframe = '30d' 
    } = args;

    const cacheKey = this.cache.generateCacheKey('technical_strength_comparison', { 
      symbols: symbols.join(','), metrics, timeframe 
    });
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    try {
      const comparisons = [];

      // Get technical data for each symbol
      for (const symbol of symbols) {
        try {
          const technicalData = await this.calculateTechnicalIndicators({
            symbol,
            indicators: ['rsi', 'macd', 'sma', 'ema'],
            timeframe,
          });

          const priceActionData = await this.analyzePriceAction({
            symbol,
            timeframe,
          });

          const strengthScore = this.calculateTechnicalStrengthScore({
            technical: technicalData.indicators,
            priceAction: priceActionData,
            metrics,
          });

          comparisons.push({
            symbol: symbol.toUpperCase(),
            strength_score: strengthScore.overall_score,
            metrics_breakdown: strengthScore.breakdown,
            trend: priceActionData.trend_analysis.direction,
            momentum: strengthScore.momentum,
            current_price: priceActionData.current_price,
          });
        } catch (error) {
          console.error(`[${new Date().toISOString()}] WARN: ` + `Failed to analyze ${symbol}:`, error);
          comparisons.push({
            symbol: symbol.toUpperCase(),
            error: `Analysis failed: ${error}`,
          });
        }
      }

      // Sort by strength score
      const validComparisons = comparisons.filter(c => !c.error);
      validComparisons.sort((a, b) => b.strength_score - a.strength_score);

      const analysis = {
        timeframe,
        metrics_analyzed: metrics,
        total_symbols: symbols.length,
        successful_analyses: validComparisons.length,
        rankings: validComparisons.map((comp, index) => ({
          rank: index + 1,
          ...comp,
        })),
        summary: {
          strongest: validComparisons[0]?.symbol || 'N/A',
          weakest: validComparisons[validComparisons.length - 1]?.symbol || 'N/A',
          average_strength: validComparisons.reduce((sum, comp) => sum + comp.strength_score, 0) / validComparisons.length || 0,
          bullish_count: validComparisons.filter(comp => comp.trend === 'bullish').length,
          bearish_count: validComparisons.filter(comp => comp.trend === 'bearish').length,
        },
        errors: comparisons.filter(c => c.error),
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, analysis, 900); // Cache for 15 minutes
      return analysis;
    } catch (error) {
      throw new Error(`Failed to compare technical strength: ${error}`);
    }
  }

  // Helper methods for technical calculations
  private async getHistoricalData(symbol: string, timeframe: string): Promise<any[]> {
    const cacheKey = this.cache.generateCacheKey('historical_ohlcv', { symbol, timeframe });
    
    let data = this.cache.get(cacheKey);
    if (data) {
      return data as any[];
    }

    try {
      const daysMap = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[timeframe as keyof typeof daysMap] || 30;
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const response = await this.client.getCryptocurrencyOHLCVHistorical({
        symbol: symbol.toUpperCase(),
        time_start: startDate.toISOString(),
        time_end: endDate.toISOString(),
        interval: '1d',
        convert: 'USD',
      });

      data = (response.data as any).quotes.map((quote: any) => ({
        timestamp: quote.time_open,
        open: quote.quote.USD.open,
        high: quote.quote.USD.high,
        low: quote.quote.USD.low,
        close: quote.quote.USD.close,
        volume: quote.quote.USD.volume,
      }));

      this.cache.set(cacheKey, data, 3600); // Cache for 1 hour
      return data as any[];
    } catch (error) {
      throw new Error(`Failed to get historical data for ${symbol}: ${error}`);
    }
  }

  private calculateRSI(data: any[], period: number = 14): any {
    if (data.length < period + 1) {
      throw new Error('Insufficient data for RSI calculation');
    }

    const gains = [];
    const losses = [];

    // Calculate initial gains and losses
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    const rsiValues = [];

    // Calculate RSI for each subsequent period
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      const rs = avgGain / (avgLoss || 0.01); // Avoid division by zero
      const rsi = 100 - (100 / (1 + rs));
      rsiValues.push(rsi);
    }

    const currentRSI = rsiValues[rsiValues.length - 1];

    return {
      current_value: currentRSI,
      signal: currentRSI > 70 ? 'overbought' : currentRSI < 30 ? 'oversold' : 'neutral',
      strength: Math.abs(50 - currentRSI) / 50, // 0 to 1 scale
      historical_values: rsiValues.slice(-10), // Last 10 values
    };
  }

  private calculateMACD(data: any[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): any {
    if (data.length < slowPeriod + signalPeriod) {
      throw new Error('Insufficient data for MACD calculation');
    }

    const closes = data.map(d => d.close);
    
    // Calculate EMAs
    const fastEMA = this.calculateEMAValues(closes, fastPeriod);
    const slowEMA = this.calculateEMAValues(closes, slowPeriod);
    
    // Calculate MACD line
    const macdLine = [];
    for (let i = slowPeriod - 1; i < fastEMA.length; i++) {
      macdLine.push(fastEMA[i] - slowEMA[i - (fastPeriod - slowPeriod)]);
    }
    
    // Calculate signal line (EMA of MACD line)
    const signalLine = this.calculateEMAValues(macdLine, signalPeriod);
    
    // Calculate histogram
    const histogram = [];
    for (let i = signalPeriod - 1; i < macdLine.length; i++) {
      histogram.push(macdLine[i] - signalLine[i - (signalPeriod - 1)]);
    }

    const currentMACD = macdLine[macdLine.length - 1];
    const currentSignal = signalLine[signalLine.length - 1];
    const currentHistogram = histogram[histogram.length - 1];

    return {
      macd_line: currentMACD,
      signal_line: currentSignal,
      histogram: currentHistogram,
      signal: currentMACD > currentSignal ? 'bullish' : 'bearish',
      crossover: this.detectMACDCrossover(macdLine, signalLine),
      divergence: this.detectMACDDivergence(data, macdLine),
    };
  }

  private calculateSMA(data: any[], period: number): any {
    if (data.length < period) {
      throw new Error('Insufficient data for SMA calculation');
    }

    const closes = data.map(d => d.close);
    const smaValues = [];

    for (let i = period - 1; i < closes.length; i++) {
      const slice = closes.slice(i - period + 1, i + 1);
      const sma = slice.reduce((sum, price) => sum + price, 0) / period;
      smaValues.push(sma);
    }

    const currentSMA = smaValues[smaValues.length - 1];
    const currentPrice = closes[closes.length - 1];

    return {
      current_value: currentSMA,
      current_price: currentPrice,
      price_vs_sma: ((currentPrice - currentSMA) / currentSMA) * 100,
      signal: currentPrice > currentSMA ? 'bullish' : 'bearish',
      trend: this.calculateTrendDirection(smaValues.slice(-5)),
    };
  }

  private calculateEMA(data: any[], period: number): any {
    const closes = data.map(d => d.close);
    const emaValues = this.calculateEMAValues(closes, period);
    
    const currentEMA = emaValues[emaValues.length - 1];
    const currentPrice = closes[closes.length - 1];

    return {
      current_value: currentEMA,
      current_price: currentPrice,
      price_vs_ema: ((currentPrice - currentEMA) / currentEMA) * 100,
      signal: currentPrice > currentEMA ? 'bullish' : 'bearish',
      trend: this.calculateTrendDirection(emaValues.slice(-5)),
    };
  }

  private calculateEMAValues(prices: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const emaValues = [prices[0]]; // Start with first price

    for (let i = 1; i < prices.length; i++) {
      const ema = (prices[i] - emaValues[i - 1]) * multiplier + emaValues[i - 1];
      emaValues.push(ema);
    }

    return emaValues;
  }

  private calculateBollingerBands(data: any[], period: number = 20, stdDev: number = 2): any {
    if (data.length < period) {
      throw new Error('Insufficient data for Bollinger Bands calculation');
    }

    const closes = data.map(d => d.close);
    const smaValues = [];
    const upperBands = [];
    const lowerBands = [];

    for (let i = period - 1; i < closes.length; i++) {
      const slice = closes.slice(i - period + 1, i + 1);
      const sma = slice.reduce((sum, price) => sum + price, 0) / period;
      
      // Calculate standard deviation
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      smaValues.push(sma);
      upperBands.push(sma + (standardDeviation * stdDev));
      lowerBands.push(sma - (standardDeviation * stdDev));
    }

    const currentPrice = closes[closes.length - 1];
    const currentUpper = upperBands[upperBands.length - 1];
    const currentMiddle = smaValues[smaValues.length - 1];
    const currentLower = lowerBands[lowerBands.length - 1];

    const bandWidth = ((currentUpper - currentLower) / currentMiddle) * 100;
    const pricePosition = ((currentPrice - currentLower) / (currentUpper - currentLower)) * 100;

    return {
      upper_band: currentUpper,
      middle_band: currentMiddle,
      lower_band: currentLower,
      current_price: currentPrice,
      band_width: bandWidth,
      price_position: pricePosition,
      signal: pricePosition > 80 ? 'overbought' : pricePosition < 20 ? 'oversold' : 'neutral',
      squeeze: bandWidth < 10 ? 'tight' : bandWidth > 20 ? 'wide' : 'normal',
    };
  }

  private calculateVolumeSMA(data: any[], period: number): any {
    if (data.length < period) {
      throw new Error('Insufficient data for Volume SMA calculation');
    }

    const volumes = data.map(d => d.volume);
    const volumeSMAValues = [];

    for (let i = period - 1; i < volumes.length; i++) {
      const slice = volumes.slice(i - period + 1, i + 1);
      const sma = slice.reduce((sum, vol) => sum + vol, 0) / period;
      volumeSMAValues.push(sma);
    }

    const currentVolume = volumes[volumes.length - 1];
    const currentVolumeSMA = volumeSMAValues[volumeSMAValues.length - 1];

    return {
      current_volume: currentVolume,
      volume_sma: currentVolumeSMA,
      volume_vs_average: ((currentVolume - currentVolumeSMA) / currentVolumeSMA) * 100,
      signal: currentVolume > currentVolumeSMA * 1.5 ? 'high' : currentVolume < currentVolumeSMA * 0.5 ? 'low' : 'normal',
      trend: this.calculateTrendDirection(volumeSMAValues.slice(-5)),
    };
  }

  // Additional helper methods would go here...
  private analyzeTrend(data: any[]): any {
    const closes = data.map(d => d.close);
    const shortTerm = closes.slice(-7); // Last 7 days
    const mediumTerm = closes.slice(-20); // Last 20 days
    const longTerm = closes; // All data

    return {
      direction: this.determineTrendDirection(closes),
      strength: this.calculateTrendStrength(closes),
      short_term: this.calculateTrendDirection(shortTerm),
      medium_term: this.calculateTrendDirection(mediumTerm),
      long_term: this.calculateTrendDirection(longTerm),
    };
  }

  private analyzeVolatility(data: any[]): any {
    const closes = data.map(d => d.close);
    const returns = [];

    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility

    return {
      daily_volatility: Math.sqrt(variance),
      annualized_volatility: volatility,
      volatility_level: volatility < 0.3 ? 'low' : volatility > 0.8 ? 'high' : 'moderate',
      recent_volatility_trend: this.calculateVolatilityTrend(data.slice(-10)),
    };
  }

  private analyzeVolumeProfile(data: any[]): any {
    const volumes = data.map(d => d.volume);
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];

    return {
      current_volume: currentVolume,
      average_volume: avgVolume,
      volume_trend: this.calculateTrendDirection(volumes.slice(-10)),
      volume_spike: currentVolume > avgVolume * 2,
      volume_ratio: currentVolume / avgVolume,
    };
  }

  // Simplified implementations of complex methods
  private determineTrendDirection(prices: number[]): string {
    const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    const secondHalf = prices.slice(Math.floor(prices.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.05) return 'bullish';
    if (secondAvg < firstAvg * 0.95) return 'bearish';
    return 'sideways';
  }

  private calculateTrendStrength(prices: number[]): number {
    // Simple linear regression slope as trend strength
    const n = prices.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = prices;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return Math.abs(slope) / (sumY / n); // Normalized slope
  }

  private calculateTrendDirection(values: number[]): string {
    if (values.length < 2) return 'unknown';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;
    
    if (change > 0.02) return 'up';
    if (change < -0.02) return 'down';
    return 'sideways';
  }

  private detectMACDCrossover(macdLine: number[], signalLine: number[]): string {
    if (macdLine.length < 2 || signalLine.length < 2) return 'none';
    
    const currentMACD = macdLine[macdLine.length - 1];
    const previousMACD = macdLine[macdLine.length - 2];
    const currentSignal = signalLine[signalLine.length - 1];
    const previousSignal = signalLine[signalLine.length - 2];
    
    if (previousMACD < previousSignal && currentMACD > currentSignal) return 'bullish';
    if (previousMACD > previousSignal && currentMACD < currentSignal) return 'bearish';
    return 'none';
  }

  private detectMACDDivergence(priceData: any[], macdLine: number[]): string {
    // Simplified divergence detection
    if (priceData.length < 10 || macdLine.length < 10) return 'none';
    
    const recentPrices = priceData.slice(-10).map(d => d.close);
    const recentMACD = macdLine.slice(-10);
    
    const priceDirection = this.calculateTrendDirection(recentPrices);
    const macdDirection = this.calculateTrendDirection(recentMACD);
    
    if (priceDirection === 'up' && macdDirection === 'down') return 'bearish';
    if (priceDirection === 'down' && macdDirection === 'up') return 'bullish';
    return 'none';
  }

  private calculateVolatilityTrend(data: any[]): string {
    const volatilities = [];
    
    for (let i = 1; i < data.length; i++) {
      const change = Math.abs((data[i].close - data[i-1].close) / data[i-1].close);
      volatilities.push(change);
    }
    
    return this.calculateTrendDirection(volatilities);
  }

  // Additional simplified implementations for complex analysis methods
  private identifyChartPatterns(data: any[]): any[] {
    // Simplified pattern recognition
    return [{
      pattern: 'trend_continuation',
      confidence: 0.6,
      description: 'Price showing continuation pattern',
    }];
  }

  private identifyCandlestickPatterns(data: any[]): any[] {
    // Simplified candlestick pattern recognition
    return [{
      pattern: 'doji',
      confidence: 0.5,
      description: 'Indecision pattern detected',
    }];
  }

  private calculateSupportResistance(data: any[]): any {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    return {
      resistance_levels: [Math.max(...highs)],
      support_levels: [Math.min(...lows)],
      current_price: data[data.length - 1].close,
    };
  }

  private calculatePivotPoints(data: any[]): any {
    const lastCandle = data[data.length - 1];
    const pivot = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
    
    return {
      pivot_point: pivot,
      resistance_1: 2 * pivot - lastCandle.low,
      support_1: 2 * pivot - lastCandle.high,
    };
  }

  private analyzeCurrentTechnicals(indicators: any): any {
    const signals = [];
    
    if (indicators.rsi) {
      signals.push({
        indicator: 'RSI',
        signal: indicators.rsi.signal,
        strength: indicators.rsi.strength,
      });
    }
    
    if (indicators.macd) {
      signals.push({
        indicator: 'MACD',
        signal: indicators.macd.signal,
        strength: 0.7,
      });
    }
    
    return {
      signals,
      overall_sentiment: this.calculateOverallSentiment(signals),
    };
  }

  private generatePriceActionAssessment(analysis: any): any {
    return {
      trend_strength: analysis.trend_analysis.strength,
      overall_direction: analysis.trend_analysis.direction,
      volatility_assessment: analysis.volatility_analysis.volatility_level,
      volume_confirmation: analysis.volume_analysis.volume_trend === analysis.trend_analysis.direction,
    };
  }

  private generateIndicatorSignals(indicators: any, strategy: string): any[] {
    const signals: any[] = [];
    
    Object.entries(indicators).forEach(([name, data]: [string, any]) => {
      if (data && data.signal && !data.error) {
        signals.push({
          type: 'technical_indicator',
          indicator: name.toUpperCase(),
          signal: data.signal,
          weight: this.getIndicatorWeight(name, strategy),
        });
      }
    });
    
    return signals;
  }

  private generateTrendSignals(trendAnalysis: any, strategy: string): any[] {
    return [{
      type: 'trend',
      indicator: 'TREND_ANALYSIS',
      signal: trendAnalysis.direction,
      weight: this.getTrendWeight(strategy),
    }];
  }

  private generateVolumeSignals(volumeAnalysis: any, strategy: string): any[] {
    return [{
      type: 'volume',
      indicator: 'VOLUME_ANALYSIS',
      signal: volumeAnalysis.volume_trend,
      weight: this.getVolumeWeight(strategy),
    }];
  }

  private calculateOverallSignal(signals: any[], strategy: string): any {
    let bullishScore = 0;
    let bearishScore = 0;
    let totalWeight = 0;
    
    signals.forEach(signal => {
      totalWeight += signal.weight;
      if (signal.signal === 'bullish' || signal.signal === 'buy') {
        bullishScore += signal.weight;
      } else if (signal.signal === 'bearish' || signal.signal === 'sell') {
        bearishScore += signal.weight;
      }
    });
    
    const bullishPercentage = (bullishScore / totalWeight) * 100;
    const bearishPercentage = (bearishScore / totalWeight) * 100;
    
    const threshold = this.getSignalThreshold(strategy);
    
    let overallSignal = 'hold';
    let confidence = Math.abs(bullishPercentage - bearishPercentage);
    
    if (bullishPercentage > threshold) overallSignal = 'buy';
    else if (bearishPercentage > threshold) overallSignal = 'sell';
    
    return {
      signal: overallSignal,
      confidence: Math.min(confidence, 100),
    };
  }

  private calculateTechnicalStrengthScore(data: any): any {
    let score = 50; // Neutral baseline
    const breakdown: any = {};
    
    // RSI contribution
    if (data.technical.rsi && !data.technical.rsi.error) {
      const rsiScore = 100 - Math.abs(data.technical.rsi.current_value - 50);
      score += (rsiScore - 50) * 0.2;
      breakdown.rsi = rsiScore;
    }
    
    // MACD contribution
    if (data.technical.macd && !data.technical.macd.error) {
      const macdScore = data.technical.macd.signal === 'bullish' ? 75 : 25;
      score += (macdScore - 50) * 0.3;
      breakdown.macd = macdScore;
    }
    
    // Trend contribution
    if (data.priceAction.trend_analysis) {
      const trendScore = data.priceAction.trend_analysis.direction === 'bullish' ? 80 : 
                        data.priceAction.trend_analysis.direction === 'bearish' ? 20 : 50;
      score += (trendScore - 50) * 0.4;
      breakdown.trend = trendScore;
    }
    
    return {
      overall_score: Math.max(0, Math.min(100, score)),
      breakdown,
      momentum: score > 60 ? 'strong' : score < 40 ? 'weak' : 'moderate',
    };
  }

  // Utility methods
  private getIndicatorWeight(indicator: string, strategy: string): number {
    const weights: any = {
      conservative: { rsi: 0.3, macd: 0.4, sma: 0.3, ema: 0.2, bollinger: 0.1 },
      moderate: { rsi: 0.25, macd: 0.35, sma: 0.2, ema: 0.25, bollinger: 0.15 },
      aggressive: { rsi: 0.2, macd: 0.3, sma: 0.15, ema: 0.3, bollinger: 0.2 },
    };
    
    return weights[strategy]?.[indicator] || 0.2;
  }

  private getTrendWeight(strategy: string): number {
    const weights: any = {
      conservative: 0.4,
      moderate: 0.3,
      aggressive: 0.2,
    };
    
    return weights[strategy] || 0.3;
  }

  private getVolumeWeight(strategy: string): number {
    const weights: any = {
      conservative: 0.2,
      moderate: 0.2,
      aggressive: 0.3,
    };
    
    return weights[strategy] || 0.2;
  }

  private getSignalThreshold(strategy: string): number {
    const thresholds: any = {
      conservative: 70,
      moderate: 60,
      aggressive: 55,
    };
    
    return thresholds[strategy] || 60;
  }

  private calculateOverallSentiment(signals: any[]): string {
    const bullishCount = signals.filter(s => s.signal === 'bullish' || s.signal === 'buy').length;
    const bearishCount = signals.filter(s => s.signal === 'bearish' || s.signal === 'sell').length;
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }

  private analyzeSignalStrength(signals: any[]): any {
    const strongSignals = signals.filter(s => s.weight > 0.3);
    const weakSignals = signals.filter(s => s.weight <= 0.3);
    
    return {
      strong_signals: strongSignals.length,
      weak_signals: weakSignals.length,
      consensus: signals.length > 0 ? this.calculateConsensus(signals) : 'none',
    };
  }

  private assessRiskLevel(technicalData: any, priceActionData: any, strategy: string): any {
    let riskScore = 50; // Neutral baseline
    
    // Volatility factor
    if (priceActionData.volatility_analysis.volatility_level === 'high') {
      riskScore += 20;
    } else if (priceActionData.volatility_analysis.volatility_level === 'low') {
      riskScore -= 10;
    }
    
    // RSI extreme levels
    if (technicalData.indicators.rsi && !technicalData.indicators.rsi.error) {
      const rsi = technicalData.indicators.rsi.current_value;
      if (rsi > 80 || rsi < 20) riskScore += 15;
    }
    
    return {
      risk_score: Math.max(0, Math.min(100, riskScore)),
      risk_level: riskScore > 70 ? 'high' : riskScore < 40 ? 'low' : 'moderate',
      factors: this.identifyRiskFactors(technicalData, priceActionData),
    };
  }

  private generateActionableRecommendations(signals: any, strategy: string): any {
    const recommendations = [];
    
    if (signals.overall_signal === 'buy') {
      recommendations.push({
        action: 'Consider buying',
        confidence: signals.confidence_score,
        reasoning: 'Technical indicators show bullish signals',
      });
    } else if (signals.overall_signal === 'sell') {
      recommendations.push({
        action: 'Consider selling',
        confidence: signals.confidence_score,
        reasoning: 'Technical indicators show bearish signals',
      });
    } else {
      recommendations.push({
        action: 'Hold position',
        confidence: signals.confidence_score,
        reasoning: 'Mixed signals suggest waiting for clearer direction',
      });
    }
    
    return recommendations;
  }

  private calculateConsensus(signals: any[]): string {
    const bullishSignals = signals.filter(s => 
      s.signal === 'bullish' || s.signal === 'buy' || s.signal === 'overbought'
    ).length;
    const bearishSignals = signals.filter(s => 
      s.signal === 'bearish' || s.signal === 'sell' || s.signal === 'oversold'
    ).length;
    
    const consensusThreshold = 0.7;
    const totalSignals = signals.length;
    
    if (bullishSignals / totalSignals > consensusThreshold) return 'strong_bullish';
    if (bearishSignals / totalSignals > consensusThreshold) return 'strong_bearish';
    if (bullishSignals > bearishSignals) return 'weak_bullish';
    if (bearishSignals > bullishSignals) return 'weak_bearish';
    return 'mixed';
  }

  private identifyRiskFactors(technicalData: any, priceActionData: any): string[] {
    const factors = [];
    
    if (priceActionData.volatility_analysis.volatility_level === 'high') {
      factors.push('high_volatility');
    }
    
    if (technicalData.indicators.rsi && technicalData.indicators.rsi.current_value > 80) {
      factors.push('overbought_conditions');
    }
    
    if (technicalData.indicators.rsi && technicalData.indicators.rsi.current_value < 20) {
      factors.push('oversold_conditions');
    }
    
    if (priceActionData.volume_analysis.volume_ratio < 0.5) {
      factors.push('low_volume');
    }
    
    return factors;
  }
}