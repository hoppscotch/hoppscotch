/**
 * JSON Response Cache Manager
 * Caches parsed JSON responses to avoid redundant parsing
 * Implements LRU (Least Recently Used) eviction policy
 */

interface CacheEntry<T> {
  key: string
  value: T
  size: number // bytes
  timestamp: number
  hits: number // number of cache hits
}

class JSONResponseCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxSize: number = 50 * 1024 * 1024 // 50MB default
  private currentSize: number = 0
  private hitRate: number = 0
  private accessHistory: string[] = []

  constructor(maxSizeBytes: number = 50 * 1024 * 1024) {
    this.maxSize = maxSizeBytes
  }

  /**
   * Generate cache key from response body
   */
  private generateKey(content: string): string {
    // Use simple hash for quick key generation
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `cache_${Math.abs(hash)}_${content.length}`
  }

  /**
   * Set value in cache
   */
  public set(content: string, value: T): void {
    const key = this.generateKey(content)

    // If already in cache, update and update hit count
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!
      entry.timestamp = Date.now()
      entry.hits++
      return
    }

    // Calculate size (rough estimate)
    const size = JSON.stringify(value).length

    // Check if we need to evict entries
    if (this.currentSize + size > this.maxSize) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      size,
      timestamp: Date.now(),
      hits: 0,
    }

    this.cache.set(key, entry)
    this.currentSize += size
    this.accessHistory.push(key)

    // Keep history size manageable
    if (this.accessHistory.length > 1000) {
      this.accessHistory.shift()
    }
  }

  /**
   * Get value from cache
   */
  public get(content: string): T | null {
    const key = this.generateKey(content)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Update timestamp for LRU tracking
    entry.timestamp = Date.now()
    entry.hits++
    this.accessHistory.push(key)

    return entry.value
  }

  /**
   * Check if content is in cache
   */
  public has(content: string): boolean {
    const key = this.generateKey(content)
    return this.cache.has(key)
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return

    // Find entry with oldest timestamp
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!
      this.currentSize -= entry.size
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Clear entire cache
   */
  public clear(): void {
    this.cache.clear()
    this.currentSize = 0
    this.accessHistory = []
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number
    entries: number
    hitRate: number
    maxSize: number
    utilizationPercent: number
  } {
    const totalAccess = this.accessHistory.length
    const uniqueAccess = new Set(this.accessHistory).size
    const hitRate = uniqueAccess > 0 ? totalAccess / uniqueAccess : 0

    return {
      size: this.currentSize,
      entries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((this.currentSize / this.maxSize) * 100),
    }
  }

  /**
   * Set maximum cache size
   */
  public setMaxSize(bytes: number): void {
    this.maxSize = bytes

    // Evict if current size exceeds new limit
    while (this.currentSize > this.maxSize && this.cache.size > 0) {
      this.evictLRU()
    }
  }
}

// Global cache instance
const jsonResponseCache = new JSONResponseCache<any>()

/**
 * Get the global JSON response cache
 */
export function getJSONResponseCache(): JSONResponseCache<any> {
  return jsonResponseCache
}

/**
 * Cache JSON parsing result
 */
export function cacheJSONResponse(content: string, parsed: any): void {
  jsonResponseCache.set(content, parsed)
}

/**
 * Retrieve cached JSON parsing result
 */
export function getCachedJSONResponse(content: string): any | null {
  return jsonResponseCache.get(content)
}

/**
 * Check if JSON response is cached
 */
export function isJSONResponseCached(content: string): boolean {
  return jsonResponseCache.has(content)
}

/**
 * Composable for using JSON cache in components
 */
export function useJSONResponseCache() {
  return {
    cache: () => jsonResponseCache,
    cacheResponse: cacheJSONResponse,
    getCached: getCachedJSONResponse,
    isCached: isJSONResponseCached,
    getStats: () => jsonResponseCache.getStats(),
    clearCache: () => jsonResponseCache.clear(),
  }
}
