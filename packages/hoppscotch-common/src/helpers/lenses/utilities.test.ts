/**
 * Tests for performance benchmarking and utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  runBenchmark,
  compareBenchmarks,
  profilePerformance,
  measureMemory,
  formatBenchmarkResult,
  getBenchmarkSummary,
  exportBenchmarkResults,
  getBenchmarkHistory,
  clearBenchmarkHistory,
} from '../lenses/performanceBenchmark'
import {
  exportToFile,
  generateResponseStats,
  validateJSONSchema,
} from '../lenses/jsonExportUtils'
import {
  flattenJSON,
  mergeJSON,
  removeSensitiveData,
  diffJSON,
  filterJSONByPath,
} from '../lenses/jsonTransform'

describe('performanceBenchmark', () => {
  beforeEach(() => {
    clearBenchmarkHistory()
  })

  it('should run a benchmark', async () => {
    const result = await runBenchmark('test', async () => {
      JSON.parse('{"test": "value"}')
    }, 5)

    expect(result.name).toBe('test')
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.throughput).toBeGreaterThanOrEqual(0)
    expect(result.timestamp).toBeGreaterThan(0)
  })

  it('should compare benchmarks', async () => {
    const strategies = {
      strategy1: async () => JSON.parse('{"test": "value"}'),
      strategy2: async () => JSON.parse('{"test": "value"}'),
    }

    const comparison = await compareBenchmarks(strategies, 3)
    expect(comparison.baseline).toBeDefined()
    expect(comparison.variations).toHaveLength(1)
    expect(comparison.recommendedStrategy).toBeDefined()
  })

  it('should profile performance', async () => {
    const profiles = await profilePerformance(
      async (size) => {
        const arr = Array(size).fill({ test: 'value' })
        JSON.stringify(arr)
      },
      [100, 1000],
      2
    )

    expect(profiles).toHaveLength(2)
    expect(profiles[0].testSize).toBe(100)
    expect(profiles[1].testSize).toBe(1000)
  })

  it('should format benchmark results', () => {
    const result = {
      name: 'test-benchmark',
      duration: 10.5,
      throughput: 95.24,
      memoryUsed: 1024,
      cpuTime: 12,
      peakMemory: 2048,
      timestamp: Date.now(),
    }

    const formatted = formatBenchmarkResult(result)
    expect(formatted).toContain('test-benchmark')
    expect(formatted).toContain('10.50')
  })

  it('should generate benchmark summary', () => {
    const results = [
      {
        name: 'test1',
        duration: 10,
        throughput: 100,
        memoryUsed: 1024,
        cpuTime: 12,
        peakMemory: 2048,
        timestamp: Date.now(),
      },
      {
        name: 'test2',
        duration: 20,
        throughput: 50,
        memoryUsed: 2048,
        cpuTime: 25,
        peakMemory: 4096,
        timestamp: Date.now(),
      },
    ]

    const summary = getBenchmarkSummary(results)
    expect(summary).toContain('Summary')
    expect(summary).toContain('Average')
    expect(summary).toContain('Fastest')
  })

  it('should export benchmark results', () => {
    const results = [
      {
        name: 'test',
        duration: 10,
        throughput: 100,
        memoryUsed: 1024,
        cpuTime: 12,
        peakMemory: 2048,
        timestamp: Date.now(),
      },
    ]

    const exported = exportBenchmarkResults(results)
    expect(typeof exported).toBe('string')
    const parsed = JSON.parse(exported)
    expect(parsed).toHaveLength(1)
  })

  it('should track benchmark history', async () => {
    expect(getBenchmarkHistory()).toHaveLength(0)

    await runBenchmark('test1', async () => {}, 1)
    expect(getBenchmarkHistory()).toHaveLength(1)

    await runBenchmark('test2', async () => {}, 1)
    expect(getBenchmarkHistory()).toHaveLength(2)
  })

  it('should clear benchmark history', async () => {
    await runBenchmark('test', async () => {}, 1)
    expect(getBenchmarkHistory().length).toBeGreaterThan(0)

    clearBenchmarkHistory()
    expect(getBenchmarkHistory()).toHaveLength(0)
  })
})

describe('jsonExportUtils', () => {
  it('should generate response statistics', () => {
    const json = '{"users": [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]}'
    const stats = generateResponseStats(json)

    expect(stats.size).toBeGreaterThan(0)
    expect(stats.sizeFormatted).toBeDefined()
    expect(stats.depth).toBeGreaterThan(0)
    expect(stats.keys).toBeGreaterThan(0)
  })

  it('should validate JSON schema', () => {
    const json = '{"id": 1, "name": "test"}'
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
      },
    }

    const isValid = validateJSONSchema(json, schema)
    expect(typeof isValid).toBe('boolean')
  })

  it('should handle large response statistics', () => {
    const largeJson = JSON.stringify({
      data: Array(1000).fill({ id: 1, value: 'test' }),
    })

    const stats = generateResponseStats(largeJson)
    expect(stats.size).toBeGreaterThan(1000)
  })
})

describe('jsonTransform', () => {
  it('should flatten JSON', () => {
    const json = { a: { b: { c: 1 } }, d: 2 }
    const flat = flattenJSON(json)

    expect(flat['a.b.c']).toBe(1)
    expect(flat['d']).toBe(2)
  })

  it('should merge JSON objects', () => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { b: 3, c: 4 }
    const merged = mergeJSON(obj1, obj2)

    expect(merged.a).toBe(1)
    expect(merged.b).toBe(3) // obj2 overwrites
    expect(merged.c).toBe(4)
  })

  it('should remove sensitive data', () => {
    const json = '{"username": "john", "password": "secret123", "email": "test@test.com"}'
    const sanitized = removeSensitiveData(json, ['password'])

    expect(sanitized).not.toContain('secret123')
    expect(sanitized).toContain('username')
  })

  it('should filter JSON by path', () => {
    const json = '{"user": {"id": 1, "name": "john"}, "admin": {"id": 2}}'
    const filtered = filterJSONByPath(json, /^user\./)

    expect(JSON.stringify(filtered)).toContain('john')
  })

  it('should diff JSON objects', () => {
    const json1 = { a: 1, b: 2, c: 3 }
    const json2 = { a: 1, b: 3, d: 4 }
    const diff = diffJSON(json1, json2)

    expect(diff.added).toContain('d')
    expect(diff.removed).toContain('c')
    expect(diff.modified).toContain('b')
  })

  it('should handle deeply nested flattening', () => {
    let json: any = { value: 1 }
    for (let i = 0; i < 10; i++) {
      json = { [`level${i}`]: json }
    }

    const flat = flattenJSON(json)
    expect(Object.keys(flat).length).toBeGreaterThan(0)
  })

  it('should merge multiple objects', () => {
    const obj1 = { a: 1 }
    const obj2 = { b: 2 }
    const obj3 = { c: 3 }
    const merged = mergeJSON(obj1, obj2, obj3)

    expect(merged).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('should handle circular reference removal', () => {
    const json = '{"id": 1, "password": "secret", "apiKey": "key123"}'
    const sanitized = removeSensitiveData(json, ['password', 'apiKey'])

    expect(sanitized).not.toContain('secret')
    expect(sanitized).not.toContain('key123')
  })
})

describe('Edge Cases', () => {
  it('should handle empty benchmark comparison', async () => {
    const strategies = {
      only: async () => {},
    }

    const comparison = await compareBenchmarks(strategies, 1)
    expect(comparison.baseline).toBeDefined()
    expect(comparison.variations).toHaveLength(0)
  })

  it('should handle empty JSON transformation', () => {
    const flat = flattenJSON({})
    expect(flat).toEqual({})
  })

  it('should handle empty merge', () => {
    const merged = mergeJSON({}, {})
    expect(merged).toEqual({})
  })

  it('should handle empty diff', () => {
    const diff = diffJSON({ a: 1 }, { a: 1 })
    expect(diff.added).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
    expect(diff.modified).toHaveLength(0)
  })

  it('should handle statistics on empty JSON', () => {
    const stats = generateResponseStats('{}')
    expect(stats.size).toBeGreaterThan(0)
    expect(stats.keys).toBeGreaterThanOrEqual(0)
  })

  it('should handle sensitive data on empty JSON', () => {
    const sanitized = removeSensitiveData('{}', ['password'])
    expect(sanitized).toBe('{}')
  })
})

describe('Performance Characteristics', () => {
  it('should benchmark parse operations', async () => {
    const result = await runBenchmark(
      'json-parse',
      async () => {
        JSON.parse('{"test": "value"}')
      },
      10
    )

    expect(result.duration).toBeLessThan(100) // Should be fast
  })

  it('should benchmark stringify operations', async () => {
    const result = await runBenchmark(
      'json-stringify',
      async () => {
        JSON.stringify({ test: 'value' })
      },
      10
    )

    expect(result.duration).toBeLessThan(100) // Should be fast
  })

  it('should profile multiple sizes', async () => {
    const profiles = await profilePerformance(
      async (size) => {
        const arr = Array(size).fill(0)
        JSON.stringify(arr)
      },
      [10, 100, 1000],
      2
    )

    expect(profiles.length).toBe(3)
    // Larger sizes should generally be slower
    expect(profiles[2].averageDuration).toBeGreaterThanOrEqual(profiles[0].averageDuration)
  })
})
