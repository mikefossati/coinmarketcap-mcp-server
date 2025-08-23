import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { CMCApiResponse, CMCError } from '../types/index.js';
import { LogData, RequestStats } from '../types/api.js';

// Enhanced logging utility
class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  static info(message: string, data?: LogData): void {
    console.error(`[${this.formatTimestamp()}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  static error(message: string, error?: Error | string | LogData): void {
    console.error(`[${this.formatTimestamp()}] ERROR: ${message}`, error);
  }

  static warn(message: string, data?: LogData): void {
    console.error(`[${this.formatTimestamp()}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  static debug(message: string, data?: LogData): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.error(`[${this.formatTimestamp()}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }
}

export class CoinMarketCapClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly maxRequestsPerMinute: number;

  constructor(apiKey: string, baseURL: string = 'https://pro-api.coinmarketcap.com', maxRequestsPerMinute: number = 100) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.maxRequestsPerMinute = maxRequestsPerMinute;

    Logger.info('Initializing CoinMarketCap API Client', {
      baseURL,
      maxRequestsPerMinute,
      timeout: '10s',
      apiKeyConfigured: !!apiKey,
    });

    this.client = axios.create({
      baseURL,
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json',
        'Accept-Encoding': 'deflate, gzip',
        'User-Agent': 'CoinMarketCap-MCP-Server/1.0.0',
      },
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor with logging
    this.client.interceptors.request.use(
      (config) => {
        this.checkRateLimit();
        this.requestCount++;
        
        const requestId = Math.random().toString(36).substring(7);
        (config as any).metadata = { requestId, startTime: Date.now() };
        
        Logger.debug('API Request Starting', {
          requestId,
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
          requestCount: this.requestCount,
          remainingRequests: this.maxRequestsPerMinute - this.requestCount,
        });
        
        return config;
      },
      (error) => {
        Logger.error('API Request Setup Failed', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor with detailed logging
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - ((response.config as any).metadata?.startTime || 0);
        const requestId = (response.config as any).metadata?.requestId;
        
        Logger.info('API Request Successful', {
          requestId,
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          url: response.config.url,
          params: response.config.params,
          dataSize: JSON.stringify(response.data).length,
          creditsUsed: response.data?.status?.credit_count || 'N/A',
          remainingCredits: response.headers['x-cmc-plan-credits-remaining'] || 'N/A',
        });

        // Log API usage statistics from response headers
        if (response.data?.status) {
          Logger.debug('CMC API Status', {
            requestId,
            timestamp: response.data.status.timestamp,
            elapsed: response.data.status.elapsed,
            credit_count: response.data.status.credit_count,
            notice: response.data.status.notice,
          });
        }

        return response;
      },
      (error: AxiosError) => {
        const duration = Date.now() - ((error.config as any)?.metadata?.startTime || 0);
        const requestId = (error.config as any)?.metadata?.requestId;
        
        // Detailed error logging
        const errorDetails = {
          requestId,
          duration: `${duration}ms`,
          url: error.config?.url,
          params: error.config?.params,
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
        };

        const responseData = error.response?.data as any;
        if (responseData?.status?.error_message) {
          const cmcError: CMCError = {
            error_code: responseData.status.error_code,
            error_message: responseData.status.error_message,
          };
          
          Logger.error('CMC API Error Response', {
            ...errorDetails,
            cmcErrorCode: cmcError.error_code,
            cmcErrorMessage: cmcError.error_message,
            fullResponse: error.response?.data,
          });
          
          return Promise.reject(new Error(`CMC API Error ${cmcError.error_code}: ${cmcError.error_message}`));
        }

        // Handle different types of HTTP errors
        if (error.response) {
          // Server responded with error status
          Logger.error('HTTP Error Response', {
            ...errorDetails,
            responseData: error.response.data,
          });
          
          switch (error.response.status) {
          case 401:
            Logger.error('Authentication Failed - Check API Key', { requestId });
            break;
          case 402:
            Logger.error('Payment Required - API Plan Limit Reached', { requestId });
            break;
          case 403:
            Logger.error('Forbidden - API Key Invalid or Suspended', { requestId });
            break;
          case 429:
            Logger.warn('Rate Limit Exceeded', {
              requestId,
              retryAfter: error.response.headers['retry-after'],
              remainingCredits: error.response.headers['x-cmc-plan-credits-remaining'],
            });
            break;
          case 500:
            Logger.error('CMC Server Internal Error', { requestId });
            break;
          default:
            Logger.error(`HTTP ${error.response.status} Error`, errorDetails);
          }
        } else if (error.request) {
          // Request made but no response received
          Logger.error('Network Error - No Response Received', {
            requestId,
            duration: `${duration}ms`,
            timeout: error.code === 'ECONNABORTED',
            message: error.message,
          });
        } else {
          // Request setup error
          Logger.error('Request Setup Error', {
            requestId,
            message: error.message,
            stack: error.stack,
          });
        }
        
        return Promise.reject(error);
      },
    );
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;

    if (timeSinceReset >= 60000) {
      Logger.debug('Rate limit window reset', {
        previousCount: this.requestCount,
        timeSinceLastReset: `${timeSinceReset}ms`,
      });
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - timeSinceReset;
      Logger.warn('Rate limit exceeded', {
        currentRequests: this.requestCount,
        maxRequests: this.maxRequestsPerMinute,
        waitTimeSeconds: Math.ceil(waitTime / 1000),
        resetTime: new Date(now + waitTime).toISOString(),
      });
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<CMCApiResponse<T>> {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      Logger.debug('Making CMC API request', {
        requestId,
        endpoint,
        params: params ? Object.keys(params) : 'none', // Log param keys but not values for privacy
      });

      const response: AxiosResponse<CMCApiResponse<T>> = await this.client.get(endpoint, { params });
      
      Logger.info('CMC API request completed successfully', {
        requestId,
        endpoint,
        status: response.status,
        dataReceived: !!response.data,
      });

      return response.data;
    } catch (error) {
      Logger.error(`CMC API request failed for ${endpoint}`, {
        requestId,
        endpoint,
        params: params ? Object.keys(params) : 'none',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        } : error,
      });
      throw error;
    }
  }

  async getCryptocurrencyListingsLatest(params?: {
    start?: number;
    limit?: number;
    price_min?: number;
    price_max?: number;
    market_cap_min?: number;
    market_cap_max?: number;
    volume_24h_min?: number;
    volume_24h_max?: number;
    circulating_supply_min?: number;
    circulating_supply_max?: number;
    percent_change_24h_min?: number;
    percent_change_24h_max?: number;
    convert?: string;
    convert_id?: string;
    sort?: string;
    sort_dir?: string;
    cryptocurrency_type?: string;
    tag?: string;
    aux?: string;
  }) {
    return this.get('/v1/cryptocurrency/listings/latest', params);
  }

  async getCryptocurrencyQuotesLatest(params: {
    id?: string;
    slug?: string;
    symbol?: string;
    convert?: string;
    convert_id?: string;
    aux?: string;
  }) {
    return this.get('/v2/cryptocurrency/quotes/latest', params);
  }

  async getCryptocurrencyInfo(params: {
    id?: string;
    slug?: string;
    symbol?: string;
    address?: string;
    aux?: string;
  }) {
    return this.get('/v2/cryptocurrency/info', params);
  }

  async getCryptocurrencyQuotesHistorical(params: {
    id?: string;
    symbol?: string;
    time_start?: string;
    time_end?: string;
    count?: number;
    interval?: string;
    convert?: string;
    convert_id?: string;
    aux?: string;
  }) {
    return this.get('/v2/cryptocurrency/quotes/historical', params);
  }

  async getCryptocurrencyOHLCVHistorical(params: {
    id?: string;
    symbol?: string;
    time_start?: string;
    time_end?: string;
    count?: number;
    interval?: string;
    convert?: string;
    convert_id?: string;
    aux?: string;
  }) {
    return this.get('/v1/cryptocurrency/ohlcv/historical', params);
  }

  async getGlobalMetricsQuotesLatest(params?: {
    convert?: string;
    convert_id?: string;
  }) {
    return this.get('/v1/global-metrics/quotes/latest', params);
  }

  async getCryptocurrencyTrendingLatest(params?: {
    start?: number;
    limit?: number;
    time_period?: string;
    convert?: string;
    convert_id?: string;
  }) {
    return this.get('/v1/cryptocurrency/trending/latest', params);
  }

  async getCryptocurrencyTrendingGainersLosers(params?: {
    start?: number;
    limit?: number;
    time_period?: string;
    convert?: string;
    convert_id?: string;
    sort?: string;
    sort_dir?: string;
  }) {
    return this.get('/v1/cryptocurrency/trending/gainers-losers', params);
  }

  async getCryptocurrencyPricePerformanceStats(params: {
    id?: string;
    slug?: string;
    symbol?: string;
    time_period?: string;
    convert?: string;
    convert_id?: string;
  }) {
    return this.get('/v2/cryptocurrency/price-performance-stats', params);
  }

  getRequestStats(): RequestStats {
    return {
      requestCount: this.requestCount,
      lastResetTime: this.lastResetTime,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      remainingRequests: this.maxRequestsPerMinute - this.requestCount,
    };
  }
}