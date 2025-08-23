import Joi from 'joi';

export const validateSymbol = (symbol: string): string => {
  const schema = Joi.string().alphanum().min(1).max(10).uppercase().required();
  const { error, value } = schema.validate(symbol.toUpperCase());
  
  if (error) {
    throw new Error(`Invalid symbol: ${error.details[0].message}`);
  }
  
  return value;
};

export const validateSymbols = (symbols: string[]): string[] => {
  if (!Array.isArray(symbols)) {
    throw new Error('Symbols must be an array');
  }
  
  if (symbols.length === 0) {
    throw new Error('At least one symbol is required');
  }
  
  if (symbols.length > 50) {
    throw new Error('Maximum 50 symbols allowed');
  }
  
  return symbols.map(validateSymbol);
};

export const validateTimeframe = (timeframe: string): string => {
  const validTimeframes = ['1d', '7d', '30d', '90d', '1y', '2y', '5y', 'ytd', 'max'];
  
  if (!validTimeframes.includes(timeframe)) {
    throw new Error(`Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`);
  }
  
  return timeframe;
};

export const validateInterval = (interval: string): string => {
  const validIntervals = ['5m', '10m', '15m', '30m', '45m', '1h', '2h', '3h', '6h', '12h', '1d', '2d', '3d', '7d', '14d', '15d', '30d', '60d', '90d', '365d'];
  
  if (!validIntervals.includes(interval)) {
    throw new Error(`Invalid interval. Must be one of: ${validIntervals.join(', ')}`);
  }
  
  return interval;
};

export const validateCurrency = (currency: string): string => {
  const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'BTC', 'ETH'];
  const upperCurrency = currency.toUpperCase();
  
  if (!validCurrencies.includes(upperCurrency)) {
    throw new Error(`Invalid currency. Must be one of: ${validCurrencies.join(', ')}`);
  }
  
  return upperCurrency;
};

export const validateLimit = (limit: number, max: number = 5000): number => {
  const schema = Joi.number().integer().min(1).max(max).required();
  const { error, value } = schema.validate(limit);
  
  if (error) {
    throw new Error(`Invalid limit: ${error.details[0].message}`);
  }
  
  return value;
};

export const validateDateRange = (startDate: string, endDate: string): { start: Date; end: Date } => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start date format. Use YYYY-MM-DD');
  }
  
  if (isNaN(end.getTime())) {
    throw new Error('Invalid end date format. Use YYYY-MM-DD');
  }
  
  if (start >= end) {
    throw new Error('Start date must be before end date');
  }
  
  const maxRange = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years in milliseconds
  if (end.getTime() - start.getTime() > maxRange) {
    throw new Error('Date range cannot exceed 5 years');
  }
  
  if (end > new Date()) {
    throw new Error('End date cannot be in the future');
  }
  
  return { start, end };
};

export const validatePeriod = (period: number): number => {
  const schema = Joi.number().integer().min(2).max(200).required();
  const { error, value } = schema.validate(period);
  
  if (error) {
    throw new Error(`Invalid period: ${error.details[0].message}`);
  }
  
  return value;
};

export const validateConfidenceLevels = (levels: number[]): number[] => {
  if (!Array.isArray(levels)) {
    throw new Error('Confidence levels must be an array');
  }
  
  for (const level of levels) {
    if (typeof level !== 'number' || level <= 0 || level >= 1) {
      throw new Error('Confidence levels must be numbers between 0 and 1 (exclusive)');
    }
  }
  
  return levels.sort((a, b) => a - b);
};

export const validateRiskFreeRate = (rate: number): number => {
  const schema = Joi.number().min(0).max(50).required(); // 0% to 50%
  const { error, value } = schema.validate(rate);
  
  if (error) {
    throw new Error(`Invalid risk-free rate: ${error.details[0].message}`);
  }
  
  return value;
};

export const validateStrategy = (strategy: string): string => {
  const validStrategies = ['conservative', 'moderate', 'aggressive'];
  
  if (!validStrategies.includes(strategy)) {
    throw new Error(`Invalid strategy. Must be one of: ${validStrategies.join(', ')}`);
  }
  
  return strategy;
};

export const validateIndicators = (indicators: string[]): string[] => {
  const validIndicators = ['rsi', 'macd', 'sma', 'ema', 'bollinger', 'volume_sma'];
  
  if (!Array.isArray(indicators)) {
    throw new Error('Indicators must be an array');
  }
  
  for (const indicator of indicators) {
    if (!validIndicators.includes(indicator)) {
      throw new Error(`Invalid indicator '${indicator}'. Must be one of: ${validIndicators.join(', ')}`);
    }
  }
  
  return indicators;
};

export const validateMetrics = (metrics: string[]): string[] => {
  const validMetrics = ['returns', 'volatility', 'sharpe_ratio', 'max_drawdown', 'correlation', 'rsi', 'momentum', 'trend_strength'];
  
  if (!Array.isArray(metrics)) {
    throw new Error('Metrics must be an array');
  }
  
  for (const metric of metrics) {
    if (!validMetrics.includes(metric)) {
      throw new Error(`Invalid metric '${metric}'. Must be one of: ${validMetrics.join(', ')}`);
    }
  }
  
  return metrics;
};

export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, ''); // Basic XSS prevention
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};