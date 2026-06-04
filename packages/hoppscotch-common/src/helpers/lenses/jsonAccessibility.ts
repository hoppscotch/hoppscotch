/**
 * JSON Accessibility Utilities
 * Improves accessibility for JSON responses
 */

/**
 * Generate accessible description for JSON structure
 */
export function generateAccessibleDescription(jsonString: string): string {
  try {
    const obj = JSON.parse(jsonString)
    return describeObject(obj, 'JSON Response')
  } catch (error) {
    return 'Invalid JSON response'
  }
}

function describeObject(obj: any, name: string, depth = 0): string {
  const indent = '  '.repeat(depth)

  if (obj === null) {
    return `${indent}${name}: null`
  }

  if (typeof obj !== 'object') {
    return `${indent}${name}: ${typeof obj} value "${obj}"`
  }

  if (Array.isArray(obj)) {
    const items = [
      `${indent}${name}: array with ${obj.length} items`,
      ...obj
        .slice(0, 3) // Show first 3 items
        .map((item, index) =>
          describeObject(item, `[${index}]`, depth + 1)
        ),
    ]
    if (obj.length > 3) {
      items.push(`${indent}  ... and ${obj.length - 3} more items`)
    }
    return items.join('\n')
  }

  const keys = Object.keys(obj)
  const items = [
    `${indent}${name}: object with ${keys.length} properties`,
    ...keys
      .slice(0, 3)
      .map((key) =>
        describeObject(obj[key], key, depth + 1)
      ),
  ]
  if (keys.length > 3) {
    items.push(`${indent}  ... and ${keys.length - 3} more properties`)
  }
  return items.join('\n')
}

/**
 * Generate ARIA labels for JSON elements
 */
export function generateAriaLabel(
  path: string[],
  value: any,
  type: 'object' | 'array' | 'value'
): string {
  const pathStr = path.join(' > ')

  switch (type) {
    case 'object':
      return `Object at ${pathStr} with ${Object.keys(value).length} properties`
    case 'array':
      return `Array at ${pathStr} with ${value.length} items`
    case 'value':
      return `Value at ${pathStr}: ${String(value).substring(0, 50)}`
    default:
      return pathStr
  }
}

/**
 * Create keyboard navigation map for JSON structure
 */
export function createKeyboardNavigationMap(jsonString: string): Map<string, any> {
  const map = new Map<string, any>()

  try {
    const obj = JSON.parse(jsonString)
    const traverse = (current: any, path: string[] = []) => {
      const key = path.join('.')
      map.set(key || 'root', current)

      if (typeof current === 'object' && current !== null) {
        if (Array.isArray(current)) {
          current.forEach((item, index) => {
            traverse(item, [...path, `[${index}]`])
          })
        } else {
          Object.entries(current).forEach(([k, v]) => {
            traverse(v, [...path, k])
          })
        }
      }
    }

    traverse(obj)
  } catch (error) {
    console.warn('Failed to create navigation map:', error)
  }

  return map
}

/**
 * Format JSON for screen readers
 */
export function formatForScreenReader(json: string, maxLength: number = 200): string {
  try {
    const obj = JSON.parse(json)
    let description = formatValue(obj, maxLength)
    if (description.length > maxLength) {
      description = description.substring(0, maxLength) + '...'
    }
    return description
  } catch (error) {
    return 'Invalid JSON'
  }
}

function formatValue(value: any, maxLength: number): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return `text: ${value}`
  if (Array.isArray(value)) {
    return `array with ${value.length} items`
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    return `object with ${keys.length} properties: ${keys.slice(0, 3).join(', ')}`
  }
  return String(value)
}

/**
 * Add accessibility attributes to JSON viewer
 */
export function addAccessibilityAttributes(element: HTMLElement): void {
  if (!element) return

  // Mark as code region
  element.setAttribute('role', 'region')
  element.setAttribute('aria-label', 'JSON Response Content')

  // Add keyboard navigation hint
  const hint = document.createElement('div')
  hint.className = 'sr-only'
  hint.textContent = 'Use arrow keys to navigate JSON structure, Enter to expand/collapse'
  element.appendChild(hint)
}

/**
 * Composable for accessibility features
 */
export function useJSONAccessibility() {
  const getAccessibleLabel = (jsonString: string): string => {
    return generateAccessibleDescription(jsonString)
  }

  const getNavigationMap = (jsonString: string): Map<string, any> => {
    return createKeyboardNavigationMap(jsonString)
  }

  const formatForReading = (jsonString: string): string => {
    return formatForScreenReader(jsonString)
  }

  const enhanceAccessibility = (element: HTMLElement): void => {
    addAccessibilityAttributes(element)
  }

  return {
    getAccessibleLabel,
    getNavigationMap,
    formatForReading,
    enhanceAccessibility,
  }
}
