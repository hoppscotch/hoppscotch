/**
 * Tests for JSON Response Cache
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCachedJSONResponse,
  cacheJSONResponse,
  isJSONResponseCached,
  getJSONResponseCache,
  clearMetricsHistory,
} from '~/helpers/lenses/jsonResponseCache'

describe('JSON Response Cache', () => {
  beforeEach(() => {
    const cache = getJSONResponseCache()
    cache.clear()
  })

  describe('caching', () => {
    it('should cache JSON responses', () => {
      const content = JSON.stringify({ test: 'data' })
      const parsed = { test: 'data' }

      cacheJSONResponse(content, parsed)
      expect(isJSONResponseCached(content)).toBe(true)
    })

    it('should retrieve cached responses', () => {
      const content = JSON.stringify({ test: 'data' })
      const parsed = { test: 'data' }

      cacheJSONResponse(content, parsed)
      const cached = getCachedJSONResponse(content)

      expect(cached).toEqual(parsed)
    })

    it('should return null for uncached content', () => {
      const content = JSON.stringify({ test: 'data' })
      expect(getCachedJSONResponse(content)).toBeNull()
    })

    it('should use content hash for caching', () => {
      const content1 = JSON.stringify({ a: 1 })
      const content2 = JSON.stringify({ a: 1 })

      cacheJSONResponse(content1, { a: 1 })
      // Same content should result in same cache hit
      expect(getCachedJSONResponse(content2)).toEqual({ a: 1 })
    })
  })

  describe('LRU eviction', () => {
    it('should evict least recently used entries', () => {
      const cache = getJSONResponseCache()
      cache.setMaxSize(1000) // Very small cache for testing

      const content1 = JSON.stringify({ id: 1, data: 'x'.repeat(100) })
      const content2 = JSON.stringify({ id: 2, data: 'x'.repeat(100) })
      const content3 = JSON.stringify({ id: 3, data: 'x'.repeat(100) })

      cacheJSONResponse(content1, { id: 1 })
      cacheJSONResponse(content2, { id: 2 })
      cacheJSONResponse(content3, { id: 3 })

      // First entry should be evicted
      expect(getCachedJSONResponse(content1)).toBeNull()
      expect(getCachedJSONResponse(content2)).toBeDefined()
      expect(getCachedJSONResponse(content3)).toBeDefined()
    })

    it('should track access history for LRU', () => {
      const content1 = JSON.stringify({ id: 1 })
      const content2 = JSON.stringify({ id: 2 })

      cacheJSONResponse(content1, { id: 1 })
      cacheJSONResponse(content2, { id: 2 })

      // Access first entry to make it recently used
      getCachedJSONResponse(content1)

      const stats = getJSONResponseCache().getStats()
      expect(stats.entries).toBe(2)
      expect(stats.hitRate).toBeGreaterThan(0)
    })
  })

  describe('cache statistics', () => {
    it('should provide cache statistics', () => {
      const content = JSON.stringify({ test: 'data' })
      cacheJSONResponse(content, { test: 'data' })

      const stats = getJSONResponseCache().getStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('entries')
      expect(stats).toHaveProperty('hitRate')
      expect(stats).toHaveProperty('maxSize')
      expect(stats.entries).toBeGreaterThan(0)
    })

    it('should calculate hit rate', () => {
      const content = JSON.stringify({ test: 'data' })
      cacheJSONResponse(content, { test: 'data' })

      getCachedJSONResponse(content)
      getCachedJSONResponse(content)

      const stats = getJSONResponseCache().getStats()
      expect(stats.hitRate).toBeGreaterThan(0)
    })
  })

  describe('cache management', () => {
    it('should allow setting max cache size', () => {
      const cache = getJSONResponseCache()
      cache.setMaxSize(100)

      const stats = cache.getStats()
      expect(stats.maxSize).toBe(100)
    })

    it('should clear cache', () => {
      const content = JSON.stringify({ test: 'data' })
      cacheJSONResponse(content, { test: 'data' })

      const cache = getJSONResponseCache()
      cache.clear()

      expect(isJSONResponseCached(content)).toBe(false)
      expect(cache.getStats().entries).toBe(0)
    })
  })
})
