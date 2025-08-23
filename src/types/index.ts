export interface CryptoQuote {
  id: number;
  symbol: string;
  name: string;
  slug: string;
  price: number;
  market_cap: number;
  volume_24h: number;
  volume_change_24h: number;
  percent_change_1h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  percent_change_30d: number;
  percent_change_60d: number;
  percent_change_90d: number;
  market_cap_dominance: number;
  fully_diluted_market_cap: number;
  last_updated: string;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
}

export interface MarketMetrics {
  active_cryptocurrencies: number;
  active_exchanges: number;
  active_market_pairs: number;
  total_market_cap: number;
  total_volume_24h: number;
  total_volume_24h_reported: number;
  altcoin_market_cap: number;
  altcoin_volume_24h: number;
  btc_dominance: number;
  eth_dominance: number;
  quote: {
    [currency: string]: {
      total_market_cap: number;
      total_volume_24h: number;
      total_volume_24h_reported: number;
      altcoin_market_cap: number;
      altcoin_volume_24h: number;
      last_updated: string;
    };
  };
}

export interface TechnicalIndicators {
  symbol: string;
  timestamp: string;
  rsi_14?: number;
  macd_line?: number;
  signal_line?: number;
  histogram?: number;
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  ema_12?: number;
  ema_26?: number;
  bollinger_upper?: number;
  bollinger_middle?: number;
  bollinger_lower?: number;
  volume_sma?: number;
}

export interface HistoricalQuote {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  market_cap: number;
  time_open: string;
  time_close: string;
  time_high: string;
  time_low: string;
}

export interface TrendingData {
  id: number;
  symbol: string;
  name: string;
  slug: string;
  rank: number;
  status: string;
  price: number;
  volume_24h: number;
  market_cap: number;
  percent_change_24h: number;
  avg_price_change: number;
  search_interval: string;
}

export interface PortfolioHolding {
  symbol: string;
  amount: number;
  purchase_price: number;
  purchase_date?: string;
}

export interface PortfolioAnalysis {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_percentage: number;
  holdings: Array<{
    symbol: string;
    amount: number;
    current_price: number;
    current_value: number;
    cost_basis: number;
    pnl: number;
    pnl_percentage: number;
    allocation_percentage: number;
  }>;
  allocation: Array<{
    symbol: string;
    percentage: number;
  }>;
}

export interface AlertCondition {
  id: string;
  symbol: string;
  condition: 'above' | 'below' | 'change_percent';
  threshold: number;
  timeframe: '1h' | '24h' | '7d';
  created_at: string;
  triggered: boolean;
}

export interface CMCApiResponse<T> {
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
    notice: string | null;
  };
  data: T;
}

export interface CMCError {
  error_code: number;
  error_message: string;
}

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'BTC' | 'ETH';
export type SortBy = 'market_cap' | 'volume_24h' | 'percent_change_24h' | 'price' | 'name';
export type SortDirection = 'asc' | 'desc';
export type Interval = '1d' | '7d' | '30d' | '90d' | '365d';
export type TimeInterval = '5m' | '10m' | '15m' | '30m' | '45m' | '1h' | '2h' | '3h' | '6h' | '12h' | '1d' | '2d' | '3d' | '7d' | '14d' | '15d' | '30d' | '60d' | '90d' | '365d';