export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number = 100, timeWindowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.cleanupOldRequests(now);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    const now = Date.now();
    this.cleanupOldRequests(now);
    
    if (this.requests.length >= this.maxRequests) {
      throw new Error(`Rate limit exceeded: ${this.maxRequests} requests per ${this.timeWindow}ms`);
    }
    
    this.requests.push(now);
  }

  private cleanupOldRequests(now: number): void {
    const cutoff = now - this.timeWindow;
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
  }

  getRequestCount(): number {
    const now = Date.now();
    this.cleanupOldRequests(now);
    return this.requests.length;
  }

  getRemainingRequests(): number {
    return Math.max(0, this.maxRequests - this.getRequestCount());
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    return this.requests[0] + this.timeWindow;
  }

  getWaitTime(): number {
    if (this.canMakeRequest()) return 0;
    const now = Date.now();
    const resetTime = this.getResetTime();
    return Math.max(0, resetTime - now);
  }

  getStats() {
    const now = Date.now();
    this.cleanupOldRequests(now);
    
    return {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequests,
      remainingRequests: this.getRemainingRequests(),
      timeWindow: this.timeWindow,
      resetTime: this.getResetTime(),
      waitTime: this.getWaitTime(),
      requestRate: this.requests.length / (this.timeWindow / 1000), // requests per second
    };
  }
}

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(capacity: number = 100, refillRate: number = 10) {
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per second
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = Math.floor(elapsed * this.refillRate);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  getWaitTime(tokens: number = 1): number {
    this.refill();
    
    if (this.tokens >= tokens) return 0;
    
    const tokensNeeded = tokens - this.tokens;
    return (tokensNeeded / this.refillRate) * 1000; // milliseconds
  }

  getStats() {
    this.refill();
    
    return {
      availableTokens: this.tokens,
      capacity: this.capacity,
      refillRate: this.refillRate,
      utilizationRate: 1 - (this.tokens / this.capacity),
      lastRefill: this.lastRefill,
    };
  }
}