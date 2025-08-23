// Centralized logging utility with configurable levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class CentralLogger {
  private level: LogLevel;
  private enableColors: boolean;

  constructor() {
    // Set log level based on environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'error':
        this.level = LogLevel.ERROR;
        break;
      case 'warn':
        this.level = LogLevel.WARN;
        break;
      case 'info':
        this.level = LogLevel.INFO;
        break;
      case 'debug':
        this.level = LogLevel.DEBUG;
        break;
      default:
        this.level = process.env.NODE_ENV === 'development' || process.env.DEBUG ? LogLevel.DEBUG : LogLevel.INFO;
    }

    this.enableColors = process.env.NO_COLOR !== '1' && process.stdout.isTTY;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = this.formatTimestamp();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    
    if (this.enableColors) {
      const colors = {
        ERROR: '\x1b[31m', // Red
        WARN: '\x1b[33m',  // Yellow
        INFO: '\x1b[32m',  // Green
        DEBUG: '\x1b[36m', // Cyan
        RESET: '\x1b[0m'
      };
      
      return `[${timestamp}] ${colors[level as keyof typeof colors]}${level}${colors.RESET}: ${message}${contextStr}`;
    }
    
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  error(message: string, context?: any): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, context));
    }
  }

  warn(message: string, context?: any): void {
    if (this.level >= LogLevel.WARN) {
      console.error(this.formatMessage('WARN', message, context));
    }
  }

  info(message: string, context?: any): void {
    if (this.level >= LogLevel.INFO) {
      console.error(this.formatMessage('INFO', message, context));
    }
  }

  debug(message: string, context?: any): void {
    if (this.level >= LogLevel.DEBUG) {
      console.error(this.formatMessage('DEBUG', message, context));
    }
  }

  // Performance timing utility
  time(label: string): void {
    if (this.level >= LogLevel.DEBUG) {
      console.error(`[${this.formatTimestamp()}] PERF: ${label} - START`);
    }
  }

  timeEnd(label: string): void {
    if (this.level >= LogLevel.DEBUG) {
      console.error(`[${this.formatTimestamp()}] PERF: ${label} - END`);
    }
  }

  // API request/response logging helpers
  apiRequest(method: string, url: string, params?: any): void {
    this.debug('API Request', {
      method: method.toUpperCase(),
      url,
      params: params ? Object.keys(params) : undefined
    });
  }

  apiResponse(method: string, url: string, status: number, duration: number, dataSize?: number): void {
    this.info('API Response', {
      method: method.toUpperCase(),
      url,
      status,
      duration: `${duration}ms`,
      dataSize: dataSize ? `${dataSize} bytes` : undefined
    });
  }

  apiError(method: string, url: string, status: number, error: string, duration: number): void {
    this.error('API Error', {
      method: method.toUpperCase(),
      url,
      status,
      error,
      duration: `${duration}ms`
    });
  }

  // Cache logging helpers  
  cacheHit(key: string): void {
    this.debug('Cache Hit', { key });
  }

  cacheMiss(key: string): void {
    this.debug('Cache Miss', { key });
  }

  cacheSet(key: string, ttl: number, size?: number): void {
    this.debug('Cache Set', {
      key,
      ttl: `${ttl}s`,
      size: size ? `${size} bytes` : undefined
    });
  }

  // Tool execution logging
  toolStart(name: string, args: any): void {
    this.info('Tool Execution Started', {
      tool: name,
      argsProvided: !!args && Object.keys(args).length > 0
    });
  }

  toolComplete(name: string, duration: number, resultSize?: number): void {
    this.info('Tool Execution Completed', {
      tool: name,
      duration: `${duration}ms`,
      resultSize: resultSize ? `${resultSize} bytes` : undefined
    });
  }

  toolError(name: string, error: string, duration: number): void {
    this.error('Tool Execution Failed', {
      tool: name,
      error,
      duration: `${duration}ms`
    });
  }

  // Server lifecycle logging
  serverStart(config: any): void {
    this.info('Server Starting', config);
  }

  serverReady(toolCount: number): void {
    this.info('Server Ready', {
      toolsAvailable: toolCount,
      logLevel: LogLevel[this.level]
    });
  }

  serverError(error: any): void {
    this.error('Server Error', {
      error: error instanceof Error ? error.message : error,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
  }

  // Rate limiting logging
  rateLimitWarning(current: number, max: number, resetTime: Date): void {
    this.warn('Rate Limit Warning', {
      current,
      max,
      remaining: max - current,
      resetTime: resetTime.toISOString()
    });
  }

  rateLimitExceeded(waitTime: number): void {
    this.error('Rate Limit Exceeded', {
      waitTimeSeconds: Math.ceil(waitTime / 1000)
    });
  }
}

// Export singleton instance
export const logger = new CentralLogger();

// Export convenience functions for backward compatibility
export const log = {
  error: (message: string, context?: any) => logger.error(message, context),
  warn: (message: string, context?: any) => logger.warn(message, context),
  info: (message: string, context?: any) => logger.info(message, context),
  debug: (message: string, context?: any) => logger.debug(message, context),
};