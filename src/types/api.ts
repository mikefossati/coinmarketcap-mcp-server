// Enhanced API type definitions to replace 'any' types

export interface LogData {
  [key: string]: string | number | boolean | object | null | undefined | unknown;
}

export interface RequestStats {
  requestCount: number;
  lastResetTime: number;
  maxRequestsPerMinute: number;
  remainingRequests: number;
}

export interface ApiTierConfig {
  maxCallsPerMonth: number;
  maxCallsPerMinute: number;
  availableEndpoints: Record<string, string>;
  blockedEndpoints: Record<string, string>;
  features: {
    historicalData: boolean;
    trendingData: boolean;
    advancedAnalytics: boolean;
    technicalIndicators: boolean;
    riskMetrics: boolean;
  };
}

export interface HistoricalQuote {
  timestamp: string;
  quote: {
    [currency: string]: {
      price: number;
      volume_24h: number;
      volume_change_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      market_cap: number;
      timestamp: string;
    };
  };
}

export interface PerformanceMetrics {
  symbol: string;
  benchmark?: string;
  period: string;
  last_updated?: string;
  periods?: Record<string, {
    returns: number;
    annualized_return: number;
    volatility: number;
    max_drawdown: number;
    start_price: number;
    end_price: number;
    start_date: string;
    end_date: string;
    error?: string;
  }>;
  comparison_to_benchmark?: Record<string, {
    correlation: number;
    beta: number;
    alpha: number;
    excess_return: number;
    symbol_return?: number;
    benchmark_return?: number;
    outperformance?: number;
  }>;
  summary?: string;
  returns?: number;
  annualized_return?: number;
  volatility?: number;
  annualized_volatility?: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  start_price?: number;
  end_price?: number;
  start_date?: string;
  end_date?: string;
}

export interface NormalizedPerformanceData {
  [symbol: string]: {
    normalized_prices: number[];
    dates: string[];
    returns: number;
    volatility: number;
    max_drawdown: number;
  };
}

export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
  hitRate: number;
}

export interface ServerStats {
  server_name: string;
  version: string;
  description: string;
  api_provider: string;
  features: string[];
  supported_cryptocurrencies: string;
  cache_enabled: boolean;
  rate_limiting: boolean;
  uptime: number;
  memory_usage: NodeJS.MemoryUsage;
  node_version: string;
  timestamp: string;
}

export interface RateLimitStatus {
  rate_limit_status: {
    requests_made: number;
    max_requests_per_minute: number;
    remaining_requests: number;
    reset_time: string;
    time_until_reset: number;
  };
  recommendations: string[];
  timestamp: string;
}

export interface ApiTierStatus {
  api_tier_status: {
    current_tier: string;
    available_tools: number;
    unavailable_tools: number;
    feature_support: {
      historicalData: boolean;
      trendingData: boolean;
      advancedAnalytics: boolean;
      technicalIndicators: boolean;
      riskMetrics: boolean;
    };
    rate_limits: {
      maxCallsPerMonth: number;
      maxCallsPerMinute: number;
    };
  };
  available_tools: string[];
  unavailable_tools: string[];
  upgrade_info: {
    current_limitations: string[];
    upgrade_benefits: string[];
    upgrade_url: string;
  };
  configuration: {
    environment_variable: string;
    current_value: string;
    available_values: string[];
    how_to_change: string;
  };
  timestamp: string;
}