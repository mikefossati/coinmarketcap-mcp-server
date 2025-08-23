export const formatPrice = (price: number, currency: string = 'USD'): string => {
  if (price < 0.01) {
    return `${price.toFixed(8)} ${currency}`;
  } else if (price < 1) {
    return `${price.toFixed(6)} ${currency}`;
  } else if (price < 1000) {
    return `${price.toFixed(2)} ${currency}`;
  } else {
    return `${price.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`;
  }
};

export const formatMarketCap = (marketCap: number, currency: string = 'USD'): string => {
  if (marketCap >= 1e12) {
    return `${(marketCap / 1e12).toFixed(2)}T ${currency}`;
  } else if (marketCap >= 1e9) {
    return `${(marketCap / 1e9).toFixed(2)}B ${currency}`;
  } else if (marketCap >= 1e6) {
    return `${(marketCap / 1e6).toFixed(2)}M ${currency}`;
  } else if (marketCap >= 1e3) {
    return `${(marketCap / 1e3).toFixed(2)}K ${currency}`;
  } else {
    return `${marketCap.toFixed(2)} ${currency}`;
  }
};

export const formatVolume = (volume: number, currency: string = 'USD'): string => 
  formatMarketCap(volume, currency) // Same formatting logic
;

export const formatPercentage = (percentage: number, decimals: number = 2): string => {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(decimals)}%`;
};

export const formatPercentageWithColor = (percentage: number, decimals: number = 2): { text: string; color: string } => {
  const sign = percentage >= 0 ? '+' : '';
  const color = percentage >= 0 ? 'green' : 'red';
  return {
    text: `${sign}${percentage.toFixed(decimals)}%`,
    color,
  };
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  if (num >= 1e12) {
    return `${(num / 1e12).toFixed(decimals)}T`;
  } else if (num >= 1e9) {
    return `${(num / 1e9).toFixed(decimals)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(decimals)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(decimals)}K`;
  } else {
    return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
  }
};

export const formatSupply = (supply: number | null, symbol: string): string => {
  if (supply === null || supply === undefined) {
    return 'N/A';
  }
  
  return `${formatNumber(supply)} ${symbol}`;
};

export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
};

export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
};

export const formatDuration = (days: number): string => {
  if (days < 1) {
    const hours = Math.floor(days * 24);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (days < 7) {
    return `${Math.floor(days)} day${Math.floor(days) !== 1 ? 's' : ''}`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    if (remainingMonths === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    }
  }
};

export const formatRank = (rank: number): string => {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  if (rank >= 11 && rank <= 13) return `${rank}th`;
  
  const lastDigit = rank % 10;
  if (lastDigit === 1) return `${rank}st`;
  if (lastDigit === 2) return `${rank}nd`;
  if (lastDigit === 3) return `${rank}rd`;
  return `${rank}th`;
};

export const formatSignal = (signal: string): { text: string; emoji: string; color: string } => {
  const signalMap: Record<string, { text: string; emoji: string; color: string }> = {
    'buy': { text: 'BUY', emoji: '🟢', color: 'green' },
    'sell': { text: 'SELL', emoji: '🔴', color: 'red' },
    'hold': { text: 'HOLD', emoji: '🟡', color: 'yellow' },
    'bullish': { text: 'BULLISH', emoji: '📈', color: 'green' },
    'bearish': { text: 'BEARISH', emoji: '📉', color: 'red' },
    'neutral': { text: 'NEUTRAL', emoji: '➖', color: 'gray' },
    'overbought': { text: 'OVERBOUGHT', emoji: '🔥', color: 'orange' },
    'oversold': { text: 'OVERSOLD', emoji: '❄️', color: 'blue' },
  };
  
  return signalMap[signal.toLowerCase()] || { text: signal.toUpperCase(), emoji: '❓', color: 'gray' };
};

export const formatConfidence = (confidence: number): { text: string; emoji: string } => {
  if (confidence >= 80) {
    return { text: 'Very High', emoji: '🔥' };
  } else if (confidence >= 60) {
    return { text: 'High', emoji: '✅' };
  } else if (confidence >= 40) {
    return { text: 'Moderate', emoji: '⚠️' };
  } else if (confidence >= 20) {
    return { text: 'Low', emoji: '❌' };
  } else {
    return { text: 'Very Low', emoji: '🚫' };
  }
};

export const formatRiskLevel = (riskLevel: string): { text: string; emoji: string; color: string } => {
  const riskMap: Record<string, { text: string; emoji: string; color: string }> = {
    'very_low': { text: 'Very Low', emoji: '🟢', color: 'green' },
    'low': { text: 'Low', emoji: '🟡', color: 'yellow' },
    'moderate': { text: 'Moderate', emoji: '🟠', color: 'orange' },
    'high': { text: 'High', emoji: '🔴', color: 'red' },
    'very_high': { text: 'Very High', emoji: '🚨', color: 'darkred' },
  };
  
  return riskMap[riskLevel.toLowerCase()] || { text: riskLevel, emoji: '❓', color: 'gray' };
};

export const formatTrend = (trend: string): { text: string; emoji: string; color: string } => {
  const trendMap: Record<string, { text: string; emoji: string; color: string }> = {
    'up': { text: 'Upward', emoji: '↗️', color: 'green' },
    'down': { text: 'Downward', emoji: '↘️', color: 'red' },
    'sideways': { text: 'Sideways', emoji: '➡️', color: 'gray' },
    'bullish': { text: 'Bullish', emoji: '🐂', color: 'green' },
    'bearish': { text: 'Bearish', emoji: '🐻', color: 'red' },
    'unknown': { text: 'Unknown', emoji: '❓', color: 'gray' },
  };
  
  return trendMap[trend.toLowerCase()] || { text: trend, emoji: '❓', color: 'gray' };
};

export const formatVolatility = (volatility: number): { text: string; level: string } => {
  const annualizedVol = volatility * 100; // Convert to percentage
  
  if (annualizedVol < 20) {
    return { text: `${annualizedVol.toFixed(1)}% (Low)`, level: 'low' };
  } else if (annualizedVol < 50) {
    return { text: `${annualizedVol.toFixed(1)}% (Moderate)`, level: 'moderate' };
  } else if (annualizedVol < 100) {
    return { text: `${annualizedVol.toFixed(1)}% (High)`, level: 'high' };
  } else {
    return { text: `${annualizedVol.toFixed(1)}% (Very High)`, level: 'very_high' };
  }
};

export const formatCorrelation = (correlation: number): { text: string; strength: string } => {
  const absCorr = Math.abs(correlation);
  const sign = correlation >= 0 ? 'Positive' : 'Negative';
  
  let strength = '';
  if (absCorr < 0.3) {
    strength = 'Weak';
  } else if (absCorr < 0.7) {
    strength = 'Moderate';
  } else {
    strength = 'Strong';
  }
  
  return {
    text: `${correlation.toFixed(3)} (${sign} ${strength})`,
    strength: strength.toLowerCase(),
  };
};

export const formatSharpeRatio = (sharpe: number): { text: string; quality: string } => {
  let quality = '';
  if (sharpe < 0) {
    quality = 'Poor';
  } else if (sharpe < 1) {
    quality = 'Below Average';
  } else if (sharpe < 2) {
    quality = 'Good';
  } else if (sharpe < 3) {
    quality = 'Very Good';
  } else {
    quality = 'Excellent';
  }
  
  return {
    text: `${sharpe.toFixed(3)} (${quality})`,
    quality: quality.toLowerCase().replace(' ', '_'),
  };
};

export const formatBeta = (beta: number): { text: string; volatility: string } => {
  let volatility = '';
  if (beta < 0) {
    volatility = 'Inverse';
  } else if (beta < 0.5) {
    volatility = 'Low';
  } else if (beta < 1) {
    volatility = 'Moderate';
  } else if (beta < 1.5) {
    volatility = 'High';
  } else {
    volatility = 'Very High';
  }
  
  return {
    text: `${beta.toFixed(3)} (${volatility})`,
    volatility: volatility.toLowerCase(),
  };
};

export const formatDrawdown = (drawdown: number): string => `-${Math.abs(drawdown).toFixed(2)}%`;

export const formatTimeAgo = (date: string | Date): string => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(date);
  }
};

export const createSummaryTable = (data: Array<{ label: string; value: string | number; change?: number }>): string => {
  let table = '| Metric | Value | Change |\n|--------|-------|--------|\n';
  
  for (const row of data) {
    const value = typeof row.value === 'number' ? formatNumber(row.value) : row.value;
    const change = row.change !== undefined ? formatPercentage(row.change) : 'N/A';
    table += `| ${row.label} | ${value} | ${change} |\n`;
  }
  
  return table;
};

export const createComparisonTable = (symbols: string[], metrics: string[], data: any[]): string => {
  let table = `| Symbol | ${metrics.map(m => m.replace('_', ' ').toUpperCase()).join(' | ')} |\n`;
  table += `|--------|${metrics.map(() => '-------').join('|')}|\n`;
  
  for (const item of data) {
    const values = metrics.map(metric => {
      const value = item[metric];
      if (typeof value === 'number') {
        return metric.includes('percent') || metric.includes('return') ? formatPercentage(value) : formatNumber(value);
      }
      return value || 'N/A';
    });
    table += `| ${item.symbol} | ${values.join(' | ')} |\n`;
  }
  
  return table;
};