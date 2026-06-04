/**
 * JSON Response Export Utilities
 * Handles exporting JSON responses in various formats
 */

/**
 * Export JSON response to file
 */
export function exportToFile(
  content: string,
  filename: string,
  format: 'json' | 'pretty-json' | 'csv' | 'jsonl'
): void {
  let exportContent = content
  let mimeType = 'application/json'

  switch (format) {
    case 'pretty-json':
      try {
        const obj = JSON.parse(content)
        exportContent = JSON.stringify(obj, null, 2)
      } catch (error) {
        console.error('Failed to parse JSON for pretty printing:', error)
      }
      break

    case 'jsonl':
      try {
        const obj = JSON.parse(content)
        if (Array.isArray(obj)) {
          exportContent = obj.map((item) => JSON.stringify(item)).join('\n')
        } else {
          exportContent = JSON.stringify(obj)
        }
      } catch (error) {
        console.error('Failed to convert to JSONL:', error)
      }
      break

    case 'csv':
      try {
        exportContent = convertJSONToCSV(content)
        mimeType = 'text/csv'
      } catch (error) {
        console.error('Failed to convert to CSV:', error)
      }
      break
  }

  // Create blob and download
  const blob = new Blob([exportContent], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `response.${format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Convert JSON to CSV format
 */
function convertJSONToCSV(jsonString: string): string {
  try {
    const obj = JSON.parse(jsonString)
    let data: any[] = []

    if (Array.isArray(obj)) {
      data = obj
    } else {
      data = [obj]
    }

    if (data.length === 0) return ''

    // Get all unique keys
    const keys = new Set<string>()
    data.forEach((item) => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach((key) => keys.add(key))
      }
    })

    const keysArray = Array.from(keys)

    // Create CSV header
    const csv: string[] = [keysArray.map((key) => `"${key}"`).join(',')]

    // Add data rows
    data.forEach((item) => {
      const row = keysArray.map((key) => {
        const value = item[key]
        if (value === null || value === undefined) return '""'
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
        if (typeof value === 'object') return `"${JSON.stringify(value)}"`
        return `"${value}"`
      })
      csv.push(row.join(','))
    })

    return csv.join('\n')
  } catch (error) {
    console.error('CSV conversion failed:', error)
    throw error
  }
}

/**
 * Generate response statistics
 */
export function generateResponseStats(jsonString: string): {
  size: number
  sizeFormatted: string
  lines: number
  keys: number
  depth: number
  type: 'object' | 'array' | 'primitive'
} {
  const size = jsonString.length

  let sizeFormatted: string
  if (size > 1024 * 1024) {
    sizeFormatted = `${(size / (1024 * 1024)).toFixed(2)}MB`
  } else if (size > 1024) {
    sizeFormatted = `${(size / 1024).toFixed(2)}KB`
  } else {
    sizeFormatted = `${size}B`
  }

  const lines = jsonString.split('\n').length

  let keys = 0
  let depth = 0
  let type: 'object' | 'array' | 'primitive' = 'primitive'

  try {
    const obj = JSON.parse(jsonString)
    type = Array.isArray(obj) ? 'array' : typeof obj === 'object' ? 'object' : 'primitive'
    keys = countObjectKeys(obj)
    depth = calculateDepth(obj)
  } catch (error) {
    console.warn('Failed to analyze JSON:', error)
  }

  return {
    size,
    sizeFormatted,
    lines,
    keys,
    depth,
    type,
  }
}

/**
 * Count total keys in object tree
 */
function countObjectKeys(obj: any, visited = new Set()): number {
  if (visited.has(obj)) return 0
  visited.add(obj)

  if (typeof obj !== 'object' || obj === null) {
    return 0
  }

  let count = 0

  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      count += countObjectKeys(item, visited)
    })
  } else {
    count = Object.keys(obj).length
    Object.values(obj).forEach((value) => {
      count += countObjectKeys(value, visited)
    })
  }

  return count
}

/**
 * Calculate depth of nested object
 */
function calculateDepth(obj: any, currentDepth = 0, visited = new Set()): number {
  if (visited.has(obj)) return currentDepth
  visited.add(obj)

  if (typeof obj !== 'object' || obj === null) {
    return currentDepth
  }

  let maxDepth = currentDepth

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const depth = calculateDepth(item, currentDepth + 1, visited)
      maxDepth = Math.max(maxDepth, depth)
    }
  } else {
    for (const value of Object.values(obj)) {
      const depth = calculateDepth(value, currentDepth + 1, visited)
      maxDepth = Math.max(maxDepth, depth)
    }
  }

  return maxDepth
}

/**
 * Validate JSON schema
 */
export function validateJSONSchema(json: string, schema?: any): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  try {
    JSON.parse(json)
  } catch (error) {
    errors.push(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  // Basic schema validation if provided
  if (schema && errors.length === 0) {
    try {
      const obj = JSON.parse(json)
      // Simple schema validation
      if (schema.type && typeof obj !== schema.type) {
        errors.push(`Expected type ${schema.type}, got ${typeof obj}`)
      }
      if (schema.required && Array.isArray(schema.required)) {
        schema.required.forEach((key: string) => {
          if (!(key in obj)) {
            errors.push(`Missing required field: ${key}`)
          }
        })
      }
    } catch (error) {
      errors.push('Failed to validate schema')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
