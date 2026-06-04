/**
 * JSON Transformation Utilities
 * Provides utilities for transforming and manipulating JSON responses
 */

/**
 * Transform JSON with custom mapping function
 */
export function transformJSON(
  jsonString: string,
  transformer: (obj: any) => any
): string {
  try {
    const obj = JSON.parse(jsonString)
    const transformed = transformer(obj)
    return JSON.stringify(transformed, null, 2)
  } catch (error) {
    console.error('JSON transformation failed:', error)
    throw error
  }
}

/**
 * Flatten nested JSON object
 */
export function flattenJSON(obj: any, prefix: string = ''): Record<string, any> {
  const flattened: Record<string, any> = {}

  function flatten(current: any, path: string) {
    if (current === null || current === undefined) {
      flattened[path] = current
      return
    }

    if (typeof current !== 'object') {
      flattened[path] = current
      return
    }

    if (Array.isArray(current)) {
      if (current.length === 0) {
        flattened[path] = []
      } else {
        current.forEach((item, index) => {
          flatten(item, `${path}[${index}]`)
        })
      }
    } else {
      const keys = Object.keys(current)
      if (keys.length === 0) {
        flattened[path] = {}
      } else {
        keys.forEach((key) => {
          const newPath = path ? `${path}.${key}` : key
          flatten(current[key], newPath)
        })
      }
    }
  }

  flatten(obj, prefix)
  return flattened
}

/**
 * Unflatten object back to nested structure
 */
export function unflattenJSON(flat: Record<string, any>): any {
  const result: any = {}

  Object.entries(flat).forEach(([path, value]) => {
    const keys = path.split('.')
    let current = result

    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        current[key] = value
      } else {
        if (!current[key] || typeof current[key] !== 'object') {
          // Determine if next key is array index
          const nextKey = keys[index + 1]
          current[key] = /^\d+$/.test(nextKey) ? [] : {}
        }
        current = current[key]
      }
    })
  })

  return result
}

/**
 * Filter JSON by path pattern
 */
export function filterJSONByPath(
  jsonString: string,
  pathPattern: string | RegExp
): string {
  try {
    const obj = JSON.parse(jsonString)
    const flat = flattenJSON(obj)
    const pattern = typeof pathPattern === 'string' ? new RegExp(pathPattern) : pathPattern

    const filtered: Record<string, any> = {}
    Object.entries(flat).forEach(([path, value]) => {
      if (pattern.test(path)) {
        filtered[path] = value
      }
    })

    return JSON.stringify(filtered, null, 2)
  } catch (error) {
    console.error('JSON filtering failed:', error)
    throw error
  }
}

/**
 * Merge multiple JSON objects
 */
export function mergeJSON(...jsonStrings: string[]): string {
  try {
    const objects = jsonStrings.map((json) => JSON.parse(json))
    const merged = objects.reduce((acc, obj) => {
      return mergeObjects(acc, obj)
    }, {})
    return JSON.stringify(merged, null, 2)
  } catch (error) {
    console.error('JSON merge failed:', error)
    throw error
  }
}

function mergeObjects(target: any, source: any): any {
  if (typeof target !== 'object' || typeof source !== 'object') {
    return source
  }

  const result = Array.isArray(target) ? [...target] : { ...target }

  if (Array.isArray(source)) {
    return [...result, ...source]
  }

  Object.entries(source).forEach(([key, value]) => {
    if (key in result && typeof result[key] === 'object' && typeof value === 'object') {
      result[key] = mergeObjects(result[key], value)
    } else {
      result[key] = value
    }
  })

  return result
}

/**
 * Remove sensitive data from JSON
 */
export function removeSensitiveData(
  jsonString: string,
  sensitiveKeys: string[] = ['password', 'token', 'secret', 'apiKey', 'Authorization']
): string {
  try {
    const obj = JSON.parse(jsonString)
    const sanitized = sanitizeObject(obj, sensitiveKeys)
    return JSON.stringify(sanitized, null, 2)
  } catch (error) {
    console.error('Sanitization failed:', error)
    throw error
  }
}

function sanitizeObject(obj: any, sensitiveKeys: string[]): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, sensitiveKeys))
  }

  const result: any = {}
  Object.entries(obj).forEach(([key, value]) => {
    if (
      sensitiveKeys.some(
        (sensKey) =>
          key.toLowerCase().includes(sensKey.toLowerCase())
      )
    ) {
      result[key] = '[REDACTED]'
    } else if (typeof value === 'object') {
      result[key] = sanitizeObject(value, sensitiveKeys)
    } else {
      result[key] = value
    }
  })

  return result
}

/**
 * Highlight differences between two JSON objects
 */
export function diffJSON(
  json1: string,
  json2: string
): { added: Record<string, any>; removed: Record<string, any>; modified: Record<string, any> } {
  try {
    const flat1 = flattenJSON(JSON.parse(json1))
    const flat2 = flattenJSON(JSON.parse(json2))

    const added: Record<string, any> = {}
    const removed: Record<string, any> = {}
    const modified: Record<string, any> = {}

    // Find added and modified
    Object.entries(flat2).forEach(([key, value]) => {
      if (!(key in flat1)) {
        added[key] = value
      } else if (flat1[key] !== value) {
        modified[key] = { old: flat1[key], new: value }
      }
    })

    // Find removed
    Object.entries(flat1).forEach(([key, value]) => {
      if (!(key in flat2)) {
        removed[key] = value
      }
    })

    return { added, removed, modified }
  } catch (error) {
    console.error('JSON diff failed:', error)
    throw error
  }
}
