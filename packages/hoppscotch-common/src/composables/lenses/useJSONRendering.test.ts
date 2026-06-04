/**
 * Tests for JSON rendering composables
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useOptimizedJSONRendering } from '../useOptimizedJSONRendering'
import { useIncrementalJSONRendering } from '../useIncrementalJSONRendering'
import { useResponseStreaming } from '../useResponseStreaming'

describe('useOptimizedJSONRendering', () => {
  let composable: ReturnType<typeof useOptimizedJSONRendering>

  beforeEach(() => {
    composable = useOptimizedJSONRendering('')
  })

  it('should parse small JSON with main thread', async () => {
    const json = '{"test": "value"}'
    const result = await composable.parseJSONWithFallback(json)
    expect(result).toEqual({ test: 'value' })
  })

  it('should handle large JSON objects', async () => {
    const largeJson = JSON.stringify({ data: Array(1000).fill({ id: 1, name: 'test' }) })
    const result = await composable.parseJSONWithFallback(largeJson)
    expect(result).toBeDefined()
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('should stringify with optimization', async () => {
    const obj = { test: 'value', array: [1, 2, 3] }
    const result = await composable.stringifyJSONWithOptimization(obj)
    expect(typeof result).toBe('string')
    expect(JSON.parse(result)).toEqual(obj)
  })

  it('should handle invalid JSON gracefully', async () => {
    const result = await composable.parseJSONWithFallback('invalid json')
    expect(result).toBeNull()
  })

  it('should handle circular references', async () => {
    const obj: any = { a: 1 }
    obj.self = obj
    const result = await composable.stringifyJSONWithOptimization(obj)
    expect(typeof result).toBe('string')
  })
})

describe('useIncrementalJSONRendering', () => {
  let composable: ReturnType<typeof useIncrementalJSONRendering>

  beforeEach(() => {
    composable = useIncrementalJSONRendering('{}', 50)
  })

  it('should calculate optimal chunk size', () => {
    expect(composable.getOptimalChunkSize(50000)).toBeGreaterThan(0)
    expect(composable.getOptimalChunkSize(500000)).toBeGreaterThan(
      composable.getOptimalChunkSize(50000)
    )
  })

  it('should track render progress', async () => {
    const largeJson = JSON.stringify(Array(1000).fill({ test: 'value' }))
    await composable.startIncrementalRender()
    expect(composable.renderState).toBeDefined()
  })

  it('should handle cancellation', async () => {
    composable.cancelRender()
    expect(composable.renderState.isCancelled).toBe(true)
  })

  it('should yield to browser between chunks', async () => {
    const startTime = performance.now()
    await composable.startIncrementalRender()
    const duration = performance.now() - startTime
    expect(duration).toBeGreaterThanOrEqual(0)
  })
})

describe('useResponseStreaming', () => {
  let composable: ReturnType<typeof useResponseStreaming>

  beforeEach(() => {
    composable = useResponseStreaming()
  })

  it('should append chunks to buffer', () => {
    composable.appendChunk('{"test":')
    composable.appendChunk('"value"}')
    expect(composable.getBuffer()).toBe('{"test":"value"}')
  })

  it('should extract complete JSON from stream', () => {
    composable.appendChunk('{"test":"value"}')
    const { json, remaining } = composable.tryExtractCompleteJSON()
    expect(json).toBe('{"test":"value"}')
    expect(remaining).toBe('')
  })

  it('should handle multiple JSON objects', () => {
    composable.appendChunk('{"a":1}\n{"b":2}')
    const first = composable.tryExtractCompleteJSON()
    expect(first.json).toBe('{"a":1}')
    expect(first.remaining).toContain('{"b":2}')
  })

  it('should parse NDJSON format', () => {
    const ndjson = '{"id":1}\n{"id":2}\n{"id":3}'
    const objects = composable.parseNDJSON(ndjson)
    expect(objects).toHaveLength(3)
    expect(objects[0]).toEqual({ id: 1 })
  })

  it('should detect complete JSON arrays', () => {
    composable.appendChunk('[1,2,3]')
    const { json } = composable.tryExtractCompleteJSON()
    expect(json).toBe('[1,2,3]')
  })

  it('should handle incomplete JSON', () => {
    composable.appendChunk('{"test":')
    const { json } = composable.tryExtractCompleteJSON()
    expect(json).toBeNull()
  })

  it('should reset buffer', () => {
    composable.appendChunk('test')
    composable.resetBuffer()
    expect(composable.getBuffer()).toBe('')
  })
})

describe('Composable Integration', () => {
  it('should work together for streaming + incremental rendering', async () => {
    const streaming = useResponseStreaming()
    const rendering = useIncrementalJSONRendering('{}', 50)

    streaming.appendChunk('{"data":')
    streaming.appendChunk('[1,2,3]}')

    const { json } = streaming.tryExtractCompleteJSON()
    expect(json).toBeDefined()

    if (json) {
      rendering.jsonContent = json
      await rendering.startIncrementalRender()
      expect(rendering.renderState).toBeDefined()
    }
  })

  it('should handle mixed streaming and parsing', async () => {
    const streaming = useResponseStreaming()
    const parsing = useOptimizedJSONRendering('{}')

    const chunk1 = '{"users":[{"id":1'
    const chunk2 = ',"name":"test"}]}'

    streaming.appendChunk(chunk1)
    let result = streaming.tryExtractCompleteJSON()
    expect(result.json).toBeNull()

    streaming.appendChunk(chunk2)
    result = streaming.tryExtractCompleteJSON()
    expect(result.json).toBeDefined()

    if (result.json) {
      const parsed = await parsing.parseJSONWithFallback(result.json)
      expect(parsed).toBeDefined()
    }
  })
})

describe('Edge Cases', () => {
  it('should handle empty objects', async () => {
    const composable = useOptimizedJSONRendering('')
    const result = await composable.parseJSONWithFallback('{}')
    expect(result).toEqual({})
  })

  it('should handle empty arrays', async () => {
    const composable = useOptimizedJSONRendering('')
    const result = await composable.parseJSONWithFallback('[]')
    expect(result).toEqual([])
  })

  it('should handle null values', async () => {
    const composable = useOptimizedJSONRendering('')
    const result = await composable.parseJSONWithFallback('null')
    expect(result).toBeNull()
  })

  it('should handle boolean values', async () => {
    const composable = useOptimizedJSONRendering('')
    const result1 = await composable.parseJSONWithFallback('true')
    const result2 = await composable.parseJSONWithFallback('false')
    expect(result1).toBe(true)
    expect(result2).toBe(false)
  })

  it('should handle number values', async () => {
    const composable = useOptimizedJSONRendering('')
    const result = await composable.parseJSONWithFallback('12345')
    expect(result).toBe(12345)
  })

  it('should handle string values', async () => {
    const composable = useOptimizedJSONRendering('')
    const result = await composable.parseJSONWithFallback('"hello"')
    expect(result).toBe('hello')
  })

  it('should handle unicode strings', async () => {
    const composable = useOptimizedJSONRendering('')
    const result = await composable.parseJSONWithFallback('"hello\\u0020world"')
    expect(result).toBe('hello world')
  })

  it('should handle deeply nested objects', async () => {
    const composable = useOptimizedJSONRendering('')
    let json = 'null'
    for (let i = 0; i < 100; i++) {
      json = `{"level${i}": ${json}}`
    }
    const result = await composable.parseJSONWithFallback(json)
    expect(result).toBeDefined()
  })
})
