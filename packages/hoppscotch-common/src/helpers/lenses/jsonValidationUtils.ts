/**
 * JSON Validation and Schema Utilities
 * 
 * Provides comprehensive JSON validation against various schema formats
 * and validation standards.
 */

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
}

export interface ValidationError {
  path: string
  message: string
  code: string
  value?: unknown
}

export interface SchemaDefinition {
  type?: string | string[]
  properties?: Record<string, SchemaDefinition>
  required?: string[]
  items?: SchemaDefinition
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  pattern?: string
  enum?: unknown[]
  format?: string
}

/**
 * Validate JSON against a simple schema
 */
export function validateAgainstSchema(json: unknown, schema: SchemaDefinition, path: string = 'root'): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  function validate(value: unknown, currentSchema: SchemaDefinition, currentPath: string): void {
    // Type validation
    if (currentSchema.type) {
      const types = Array.isArray(currentSchema.type) ? currentSchema.type : [currentSchema.type]
      const valueType = Array.isArray(value) ? 'array' : typeof value
      if (!types.includes(valueType)) {
        errors.push({
          path: currentPath,
          message: `Expected type ${types.join(' or ')}, got ${valueType}`,
          code: 'TYPE_MISMATCH',
          value,
        })
        return
      }
    }

    // Object validation
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>

      // Required properties
      if (currentSchema.required) {
        for (const prop of currentSchema.required) {
          if (!(prop in obj)) {
            errors.push({
              path: `${currentPath}.${prop}`,
              message: `Missing required property: ${prop}`,
              code: 'MISSING_REQUIRED',
            })
          }
        }
      }

      // Property validation
      if (currentSchema.properties) {
        for (const [key, propSchema] of Object.entries(currentSchema.properties)) {
          if (key in obj) {
            validate(obj[key], propSchema, `${currentPath}.${key}`)
          }
        }
      }
    }

    // Array validation
    if (Array.isArray(value) && currentSchema.items) {
      for (let i = 0; i < value.length; i++) {
        validate(value[i], currentSchema.items, `${currentPath}[${i}]`)
      }
    }

    // String validation
    if (typeof value === 'string') {
      if (currentSchema.minLength && value.length < currentSchema.minLength) {
        errors.push({
          path: currentPath,
          message: `String too short, minimum ${currentSchema.minLength} characters`,
          code: 'STRING_TOO_SHORT',
          value,
        })
      }
      if (currentSchema.maxLength && value.length > currentSchema.maxLength) {
        errors.push({
          path: currentPath,
          message: `String too long, maximum ${currentSchema.maxLength} characters`,
          code: 'STRING_TOO_LONG',
          value,
        })
      }
      if (currentSchema.pattern && !new RegExp(currentSchema.pattern).test(value)) {
        errors.push({
          path: currentPath,
          message: `String does not match pattern: ${currentSchema.pattern}`,
          code: 'PATTERN_MISMATCH',
          value,
        })
      }
    }

    // Number validation
    if (typeof value === 'number') {
      if (currentSchema.minimum !== undefined && value < currentSchema.minimum) {
        errors.push({
          path: currentPath,
          message: `Number below minimum value of ${currentSchema.minimum}`,
          code: 'NUMBER_TOO_SMALL',
          value,
        })
      }
      if (currentSchema.maximum !== undefined && value > currentSchema.maximum) {
        errors.push({
          path: currentPath,
          message: `Number above maximum value of ${currentSchema.maximum}`,
          code: 'NUMBER_TOO_LARGE',
          value,
        })
      }
    }

    // Enum validation
    if (currentSchema.enum && !currentSchema.enum.includes(value)) {
      errors.push({
        path: currentPath,
        message: `Value must be one of: ${currentSchema.enum.join(', ')}`,
        code: 'ENUM_MISMATCH',
        value,
      })
    }
  }

  validate(json, schema, path)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern.test(email)
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate ISO 8601 date format
 */
export function isValidISO8601(date: string): boolean {
  try {
    const d = new Date(date)
    return d instanceof Date && !isNaN(d.getTime())
  } catch {
    return false
  }
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return pattern.test(uuid)
}

/**
 * Validate IP address format
 */
export function isValidIPAddress(ip: string): boolean {
  // IPv4
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.')
    return parts.every((part) => {
      const num = parseInt(part, 10)
      return num >= 0 && num <= 255
    })
  }

  // IPv6 (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/
  return ipv6Pattern.test(ip)
}

/**
 * Validate credit card format (Luhn algorithm)
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false

  let sum = 0
  let isEven = false

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Get format validator
 */
export function getFormatValidator(format: string): (value: string) => boolean {
  const validators: Record<string, (v: string) => boolean> = {
    email: isValidEmail,
    url: isValidURL,
    'iso-8601': isValidISO8601,
    uuid: isValidUUID,
    'ip-address': isValidIPAddress,
    'credit-card': isValidCreditCard,
  }

  return validators[format] || (() => true)
}

/**
 * Generate validation report
 */
export function generateValidationReport(result: ValidationResult): string {
  let report = 'JSON Validation Report\n'
  report += '=======================\n\n'
  report += `Status: ${result.isValid ? 'VALID ✓' : 'INVALID ✗'}\n\n`

  if (result.errors.length > 0) {
    report += `Errors (${result.errors.length}):\n`
    result.errors.forEach((error, i) => {
      report += `  ${i + 1}. [${error.code}] at ${error.path}\n`
      report += `     ${error.message}\n`
    })
    report += '\n'
  }

  if (result.warnings.length > 0) {
    report += `Warnings (${result.warnings.length}):\n`
    result.warnings.forEach((warning, i) => {
      report += `  ${i + 1}. ${warning}\n`
    })
  }

  return report
}

/**
 * Quick validation helpers
 */
export const validators = {
  isEmail: isValidEmail,
  isURL: isValidURL,
  isDate: isValidISO8601,
  isUUID: isValidUUID,
  isIPAddress: isValidIPAddress,
  isCreditCard: isValidCreditCard,
}
