/**
 * Advanced JSON Querying and Selection
 * 
 * Provides query language support for selecting and transforming JSON data
 * with path expressions, filters, and projections.
 */

export interface QueryResult {
  matches: unknown[]
  count: number
  executionTime: number
}

export interface PathExpression {
  segments: string[]
  filter?: (value: unknown) => boolean
  projection?: (value: unknown) => unknown
}

/**
 * Parse a path expression like "user.profile.name"
 */
export function parsePath(path: string): PathExpression {
  const segments = path.split('.').filter((s) => s)

  return {
    segments,
    filter: undefined,
    projection: undefined,
  }
}

/**
 * Get value from object by path
 */
export function getByPath(obj: unknown, path: string): unknown {
  const expr = parsePath(path)
  let current = obj

  for (const segment of expr.segments) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Set value in object by path
 */
export function setByPath(obj: Record<string, any>, path: string, value: unknown): void {
  const segments = path.split('.').filter((s) => s)
  let current = obj

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    if (!(segment in current)) {
      current[segment] = {}
    }
    current = current[segment]
  }

  current[segments[segments.length - 1]] = value
}

/**
 * Delete value from object by path
 */
export function deleteByPath(obj: Record<string, any>, path: string): boolean {
  const segments = path.split('.').filter((s) => s)
  let current = obj

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    if (!(segment in current)) {
      return false
    }
    current = current[segment]
  }

  delete current[segments[segments.length - 1]]
  return true
}

/**
 * Query JSON with filter expressions
 */
export function query(
  json: unknown,
  selector: string
): QueryResult {
  const start = performance.now()
  const matches: unknown[] = []

  function traverse(value: unknown, path: string): void {
    // Exact path match
    if (path === selector) {
      matches.push(value)
      return
    }

    // Wildcard match
    if (selector === '*' || selector === '**') {
      matches.push(value)
    }

    // Recursive descent
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>
      for (const [key, val] of Object.entries(obj)) {
        traverse(val, path ? `${path}.${key}` : key)
      }
    } else if (Array.isArray(value)) {
      value.forEach((val, i) => {
        traverse(val, `${path}[${i}]`)
      })
    }
  }

  traverse(json, '')

  const executionTime = performance.now() - start

  return {
    matches,
    count: matches.length,
    executionTime,
  }
}

/**
 * Filter array of objects by property value
 */
export function filterBy(
  array: unknown[],
  property: string,
  value: unknown
): unknown[] {
  return array.filter((item) => {
    if (typeof item !== 'object' || item === null) return false
    return (item as Record<string, unknown>)[property] === value
  })
}

/**
 * Group array of objects by property
 */
export function groupBy(array: unknown[], property: string): Record<string, unknown[]> {
  const groups: Record<string, unknown[]> = {}

  array.forEach((item) => {
    if (typeof item !== 'object' || item === null) return
    const key = String((item as Record<string, unknown>)[property])
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
  })

  return groups
}

/**
 * Sort array of objects by property
 */
export function sortBy(array: unknown[], property: string, descending = false): unknown[] {
  return [...array].sort((a, b) => {
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
      return 0
    }

    const aVal = (a as Record<string, unknown>)[property]
    const bVal = (b as Record<string, unknown>)[property]

    if (aVal < bVal) return descending ? 1 : -1
    if (aVal > bVal) return descending ? -1 : 1
    return 0
  })
}

/**
 * Extract fields from array of objects
 */
export function selectFields(array: unknown[], fields: string[]): Record<string, unknown>[] {
  return array.map((item) => {
    if (typeof item !== 'object' || item === null) return {}
    const obj = item as Record<string, unknown>
    const result: Record<string, unknown> = {}
    fields.forEach((field) => {
      result[field] = obj[field]
    })
    return result
  })
}

/**
 * Execute complex query with AND conditions
 */
export function queryAnd(json: unknown, conditions: Record<string, unknown>): QueryResult {
  const start = performance.now()
  const matches: unknown[] = []

  function traverse(value: unknown): void {
    if (typeof value !== 'object' || value === null) return

    const obj = value as Record<string, unknown>
    const allMatch = Object.entries(conditions).every(([key, val]) => obj[key] === val)

    if (allMatch) {
      matches.push(value)
    }

    // Recurse
    Object.values(obj).forEach(traverse)
  }

  traverse(json)

  const executionTime = performance.now() - start

  return {
    matches,
    count: matches.length,
    executionTime,
  }
}

/**
 * Execute complex query with OR conditions
 */
export function queryOr(json: unknown, conditions: Record<string, unknown>): QueryResult {
  const start = performance.now()
  const matches: unknown[] = []

  function traverse(value: unknown): void {
    if (typeof value !== 'object' || value === null) return

    const obj = value as Record<string, unknown>
    const anyMatch = Object.entries(conditions).some(([key, val]) => obj[key] === val)

    if (anyMatch) {
      matches.push(value)
    }

    // Recurse
    Object.values(obj).forEach(traverse)
  }

  traverse(json)

  const executionTime = performance.now() - start

  return {
    matches,
    count: matches.length,
    executionTime,
  }
}

/**
 * Find first matching object
 */
export function findFirst(array: unknown[], predicate: (item: unknown) => boolean): unknown | undefined {
  return array.find(predicate)
}

/**
 * Find all matching objects
 */
export function findAll(array: unknown[], predicate: (item: unknown) => boolean): unknown[] {
  return array.filter(predicate)
}

/**
 * Map array to new values
 */
export function map(array: unknown[], mapper: (item: unknown, index: number) => unknown): unknown[] {
  return array.map(mapper)
}

/**
 * Reduce array to single value
 */
export function reduce(
  array: unknown[],
  reducer: (acc: unknown, item: unknown, index: number) => unknown,
  initial: unknown = 0
): unknown {
  return array.reduce(reducer, initial)
}

/**
 * Create a query builder for fluent API
 */
export class QueryBuilder {
  private data: unknown

  constructor(data: unknown) {
    this.data = data
  }

  filter(predicate: (item: unknown) => boolean): QueryBuilder {
    if (!Array.isArray(this.data)) {
      return this
    }
    this.data = (this.data as unknown[]).filter(predicate)
    return this
  }

  map(mapper: (item: unknown) => unknown): QueryBuilder {
    if (!Array.isArray(this.data)) {
      return this
    }
    this.data = (this.data as unknown[]).map(mapper)
    return this
  }

  sort(compareFn: (a: unknown, b: unknown) => number): QueryBuilder {
    if (!Array.isArray(this.data)) {
      return this
    }
    this.data = [...(this.data as unknown[])].sort(compareFn)
    return this
  }

  limit(count: number): QueryBuilder {
    if (!Array.isArray(this.data)) {
      return this
    }
    this.data = (this.data as unknown[]).slice(0, count)
    return this
  }

  skip(count: number): QueryBuilder {
    if (!Array.isArray(this.data)) {
      return this
    }
    this.data = (this.data as unknown[]).slice(count)
    return this
  }

  distinct(): QueryBuilder {
    if (!Array.isArray(this.data)) {
      return this
    }
    this.data = [...new Set((this.data as unknown[]).map((item) => JSON.stringify(item)))].map(
      (item) => JSON.parse(item)
    )
    return this
  }

  getResult(): unknown {
    return this.data
  }

  toArray(): unknown[] {
    return Array.isArray(this.data) ? (this.data as unknown[]) : []
  }

  first(): unknown {
    return Array.isArray(this.data) ? (this.data as unknown[])[0] : undefined
  }

  last(): unknown {
    return Array.isArray(this.data)
      ? (this.data as unknown[])[(this.data as unknown[]).length - 1]
      : undefined
  }

  count(): number {
    return Array.isArray(this.data) ? (this.data as unknown[]).length : 0
  }
}
