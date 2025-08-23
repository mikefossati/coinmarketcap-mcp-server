import NodeCache from 'node-cache';

export class CacheManager {
  private cache: NodeCache;
  private defaultTTL: number;

  constructor(ttlSeconds: number = 300, checkPeriod: number = 60, maxKeys: number = 1000) {
    this.defaultTTL = ttlSeconds;
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: checkPeriod,
      maxKeys,
      deleteOnExpire: true,
      useClones: false,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.cache.on('expired', (key, _value) => {
      console.error(`[${new Date().toISOString()}] INFO: Cache key expired: ${key}`);
    });

    this.cache.on('flush', () => {
      console.error(`[${new Date().toISOString()}] INFO: Cache flushed`);
    });

    this.cache.on('set', (key, _value) => {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.error(`[${new Date().toISOString()}] DEBUG: Cache key set: ${key}`);
      }
    });

    this.cache.on('del', (key, _value) => {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.error(`[${new Date().toISOString()}] DEBUG: Cache key deleted: ${key}`);
      }
    });
  }

  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    const timestamp = new Date().toISOString();
    
    if (value !== undefined) {
      console.error(`[${timestamp}] INFO: Cache hit: ${key}`);
    } else if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.error(`[${timestamp}] DEBUG: Cache miss: ${key}`);
    }
    return value;
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    const actualTTL = ttl || this.defaultTTL;
    const success = this.cache.set(key, value, actualTTL);
    const timestamp = new Date().toISOString();
    
    if (success) {
      const dataSize = JSON.stringify(value).length;
      console.error(`[${timestamp}] INFO: Cache set: ${key} (TTL: ${actualTTL}s, Size: ${dataSize} bytes)`);
    } else {
      console.error(`[${timestamp}] WARN: Cache set failed: ${key}`);
    }
    return success;
  }

  del(key: string | string[]): number {
    const count = this.cache.del(key);
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] INFO: Cache deleted: ${Array.isArray(key) ? key.join(', ') : key} (${count} keys)`);
    return count;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  keys(): string[] {
    return this.cache.keys();
  }

  getStats() {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
    };
  }

  generateCacheKey(method: string, params: Record<string, unknown> = {}): string {
    // Optimize key generation by avoiding object creation for empty params
    if (Object.keys(params).length === 0) {
      return `${method}:{}`;
    }
    
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, unknown>);
    
    return `${method}:${JSON.stringify(sortedParams)}`;
  }

  getCacheKeysByPattern(pattern: RegExp): string[] {
    return this.keys().filter(key => pattern.test(key));
  }

  clearByPattern(pattern: RegExp): number {
    const keysToDelete = this.getCacheKeysByPattern(pattern);
    return this.del(keysToDelete);
  }

  getTTL(key: string): number | undefined {
    return this.cache.getTtl(key);
  }

  mget<T>(keys: string[]): Record<string, T> {
    const result = this.cache.mget<T>(keys);
    return result;
  }

  mset<T>(keyValuePairs: Array<{ key: string; val: T; ttl?: number }>): boolean {
    const success = this.cache.mset(keyValuePairs);
    if (success) {
      console.error(`[${new Date().toISOString()}] INFO: Cache mset: ${keyValuePairs.length} keys`);
    }
    return success;
  }

  // Memory optimization: Clean up expired keys manually if needed
  cleanExpired(): number {
    const expiredKeys: string[] = [];
    const allKeys = this.keys();
    
    for (const key of allKeys) {
      const ttl = this.getTTL(key);
      if (ttl !== undefined && ttl < Date.now()) {
        expiredKeys.push(key);
      }
    }
    
    if (expiredKeys.length > 0) {
      const deleted = this.del(expiredKeys);
      console.error(`[${new Date().toISOString()}] INFO: Cleaned ${deleted} expired cache keys`);
      return deleted;
    }
    
    return 0;
  }

  // Get memory usage information
  getMemoryInfo(): { keyCount: number; memoryUsage: number; hitRate: number } {
    const stats = this.getStats();
    return {
      keyCount: stats.keys,
      memoryUsage: stats.ksize + stats.vsize,
      hitRate: stats.hitRate,
    };
  }
}

export const createCacheManager = (ttlSeconds?: number, checkPeriod?: number, maxKeys?: number) => new CacheManager(ttlSeconds, checkPeriod, maxKeys);