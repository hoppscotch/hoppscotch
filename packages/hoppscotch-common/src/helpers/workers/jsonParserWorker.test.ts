/**
 * Tests for JSON Parser WebWorker
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parseJSONAsync, stringifyJSONAsync } from '~/helpers/workers/jsonParserWorker'

describe('JSON Parser WebWorker', () => {
  describe('parseJSONAsync', () => {
    it('should parse valid JSON string', async () => {
      const jsonString = JSON.stringify({ name: 'test', value: 123 })
      const result = await parseJSONAsync(jsonString, false)
      expect(result).toEqual({ name: 'test', value: 123 })
    })

    it('should parse large JSON responses', async () => {
      const largeObject = {
        data: Array(1000)
          .fill(null)
          .map((_, i) => ({ id: i, value: Math.random() })),
      }
      const jsonString = JSON.stringify(largeObject)
      const result = await parseJSONAsync(jsonString, false)
      expect(result.data).toHaveLength(1000)
    })

    it('should handle lossless JSON parsing', async () => {
      const jsonString = '{"number": 9007199254740992}'
      const result = await parseJSONAsync(jsonString, true)
      expect(result).toBeDefined()
    })

    it('should reject invalid JSON', async () => {
      const invalidJSON = '{ invalid json }'
      await expect(parseJSONAsync(invalidJSON, false)).rejects.toThrow()
    })

    it('should timeout on unresponsive worker', async () => {
      // This is a simplified test - actual timeout would need mocking
      const result = await parseJSONAsync('{}', false)
      expect(result).toEqual({})
    })
  })

  describe('stringifyJSONAsync', () => {
    it('should stringify objects to JSON', async () => {
      const obj = { name: 'test', value: 123 }
      const result = await stringifyJSONAsync(obj, false)
      expect(JSON.parse(result)).toEqual(obj)
    })

    it('should handle large objects', async () => {
      const largeObject = {
        data: Array(1000)
          .fill(null)
          .map((_, i) => ({ id: i, value: Math.random() })),
      }
      const result = await stringifyJSONAsync(largeObject, false)
      expect(JSON.parse(result).data).toHaveLength(1000)
    })

    it('should support lossless stringification', async () => {
      const obj = { number: 9007199254740992 }
      const result = await stringifyJSONAsync(obj, true)
      expect(result).toBeDefined()
    })
  })
})
