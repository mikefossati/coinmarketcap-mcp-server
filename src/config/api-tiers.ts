// CoinMarketCap API Tier Configuration
// Based on observed errors and API documentation

export enum ApiTier {
  FREE = 'free',
  STARTUP = 'startup', 
  STANDARD = 'standard',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

// Endpoints that are NOT available on free tier (based on error 1006)
export const PREMIUM_ENDPOINTS = {
  // Historical data endpoints (require paid plans)
  HISTORICAL_OHLCV: '/v1/cryptocurrency/ohlcv/historical',
  HISTORICAL_QUOTES: '/v2/cryptocurrency/quotes/historical',
  
  // Trending and social metrics (require paid plans)
  TRENDING_LATEST: '/v1/cryptocurrency/trending/latest',
  TRENDING_GAINERS_LOSERS: '/v1/cryptocurrency/trending/gainers-losers',
  
  // Advanced performance stats (require paid plans)
  PRICE_PERFORMANCE_STATS: '/v2/cryptocurrency/price-performance-stats',
  
  // Advanced market analysis (may require paid plans)
  MARKET_PAIRS_LATEST: '/v1/exchange/market-pairs/latest',
  EXCHANGE_LISTINGS_LATEST: '/v1/exchange/listings/latest',
};

// Free tier available endpoints
export const FREE_TIER_ENDPOINTS = {
  // Basic cryptocurrency data
  CRYPTOCURRENCY_LISTINGS_LATEST: '/v1/cryptocurrency/listings/latest',
  CRYPTOCURRENCY_QUOTES_LATEST: '/v2/cryptocurrency/quotes/latest',
  CRYPTOCURRENCY_INFO: '/v2/cryptocurrency/info',
  CRYPTOCURRENCY_MAP: '/v1/cryptocurrency/map',
  
  // Global metrics
  GLOBAL_METRICS_QUOTES_LATEST: '/v1/global-metrics/quotes/latest',
  
  // Tools
  PRICE_CONVERSION: '/v1/tools/price-conversion',
};

// Configuration for each API tier
export const API_TIER_CONFIG = {
  [ApiTier.FREE]: {
    maxCallsPerMonth: 10000,
    maxCallsPerMinute: 30,
    availableEndpoints: FREE_TIER_ENDPOINTS,
    blockedEndpoints: PREMIUM_ENDPOINTS,
    features: {
      historicalData: false,
      trendingData: false,
      advancedAnalytics: false,
      technicalIndicators: false, // Requires historical data
      riskMetrics: false, // Requires historical data
    }
  },
  [ApiTier.STARTUP]: {
    maxCallsPerMonth: 1000000,
    maxCallsPerMinute: 100,
    availableEndpoints: { ...FREE_TIER_ENDPOINTS, ...PREMIUM_ENDPOINTS },
    blockedEndpoints: {},
    features: {
      historicalData: true,
      trendingData: true,
      advancedAnalytics: true,
      technicalIndicators: true,
      riskMetrics: true,
    }
  }
};

// Tool to endpoint mapping (which tools require which endpoints)
export const TOOL_ENDPOINT_MAPPING = {
  // Tools that work with free tier
  'get_crypto_price': [FREE_TIER_ENDPOINTS.CRYPTOCURRENCY_QUOTES_LATEST],
  'get_multiple_prices': [FREE_TIER_ENDPOINTS.CRYPTOCURRENCY_QUOTES_LATEST],
  'get_top_cryptocurrencies': [FREE_TIER_ENDPOINTS.CRYPTOCURRENCY_LISTINGS_LATEST],
  'search_cryptocurrencies': [FREE_TIER_ENDPOINTS.CRYPTOCURRENCY_LISTINGS_LATEST],
  'get_market_overview': [FREE_TIER_ENDPOINTS.GLOBAL_METRICS_QUOTES_LATEST, FREE_TIER_ENDPOINTS.CRYPTOCURRENCY_LISTINGS_LATEST],
  'get_market_dominance': [FREE_TIER_ENDPOINTS.GLOBAL_METRICS_QUOTES_LATEST],
  
  // Tools that require premium endpoints
  'get_trending_cryptocurrencies': [PREMIUM_ENDPOINTS.TRENDING_LATEST],
  'get_gainers_losers': [PREMIUM_ENDPOINTS.TRENDING_GAINERS_LOSERS],
  'calculate_technical_indicators': [PREMIUM_ENDPOINTS.HISTORICAL_OHLCV],
  'analyze_price_action': [PREMIUM_ENDPOINTS.HISTORICAL_OHLCV],
  'generate_trading_signals': [PREMIUM_ENDPOINTS.HISTORICAL_OHLCV],
  'compare_technical_strength': [PREMIUM_ENDPOINTS.HISTORICAL_OHLCV],
  'get_historical_data': [PREMIUM_ENDPOINTS.HISTORICAL_OHLCV],
  'analyze_price_performance': [PREMIUM_ENDPOINTS.HISTORICAL_QUOTES],
  'compare_historical_performance': [PREMIUM_ENDPOINTS.HISTORICAL_QUOTES],
  'analyze_market_cycles': [PREMIUM_ENDPOINTS.HISTORICAL_OHLCV],
  'calculate_risk_metrics': [PREMIUM_ENDPOINTS.HISTORICAL_QUOTES],
  
  // Altcoin season analysis may work with free tier data
  'analyze_altcoin_season': [FREE_TIER_ENDPOINTS.CRYPTOCURRENCY_LISTINGS_LATEST],
};

export class ApiTierManager {
  private tier: ApiTier;
  private config: any;

  constructor(tier: ApiTier = ApiTier.FREE) {
    this.tier = tier;
    this.config = API_TIER_CONFIG[tier as keyof typeof API_TIER_CONFIG] || API_TIER_CONFIG[ApiTier.FREE];
  }

  setTier(tier: ApiTier): void {
    this.tier = tier;
    this.config = API_TIER_CONFIG[tier as keyof typeof API_TIER_CONFIG] || API_TIER_CONFIG[ApiTier.FREE];
  }

  getTier(): ApiTier {
    return this.tier;
  }

  isEndpointAvailable(endpoint: string): boolean {
    return !Object.values(this.config.blockedEndpoints).includes(endpoint);
  }

  isToolAvailable(toolName: string): boolean {
    const requiredEndpoints = TOOL_ENDPOINT_MAPPING[toolName as keyof typeof TOOL_ENDPOINT_MAPPING];
    if (!requiredEndpoints) return true; // Server management tools

    return requiredEndpoints.every(endpoint => this.isEndpointAvailable(endpoint));
  }

  getAvailableTools(): string[] {
    return Object.keys(TOOL_ENDPOINT_MAPPING).filter(tool => this.isToolAvailable(tool));
  }

  getUnavailableTools(): string[] {
    return Object.keys(TOOL_ENDPOINT_MAPPING).filter(tool => !this.isToolAvailable(tool));
  }

  getFeatureSupport() {
    return this.config.features;
  }

  getRateLimits() {
    return {
      maxCallsPerMonth: this.config.maxCallsPerMonth,
      maxCallsPerMinute: this.config.maxCallsPerMinute,
    };
  }

  generateUnavailableToolError(toolName: string): string {
    return `This tool (${toolName}) requires a paid CoinMarketCap API plan. ` +
           `Current tier: ${this.tier.toUpperCase()}. ` +
           `Upgrade to STARTUP plan or higher at https://coinmarketcap.com/api/pricing/ ` +
           `to access historical data and advanced analytics features.`;
  }
}