import * as E from "fp-ts/Either"
import { Environment } from "./index"
import { HOPP_SUPPORTED_PREDEFINED_VARIABLES } from "../predefinedVariables"

// Enhanced regex to support both Hoppscotch (<<>>) and Postman ({{}}) syntaxes
const REGEX_NESTED_VAR = /\{\{([^}]*)\}\}|<<([^>]*)>>/g
const NESTED_MAX_EXPAND_LIMIT = 15 // Increased limit for nested resolution
const NESTED_EXPAND_LOOP = "NESTED_EXPAND_LOOP" as const

/**
 * Enhanced parser that supports nested environment variables like Postman
 * Supports syntax: {{ {{country-code}}{{environment}} }}
 */
export function parseNestedTemplateString(
  str: string,
  variables: Environment["variables"],
  maskValue = false,
  showKeyIfSecret = false
): E.Either<typeof NESTED_EXPAND_LOOP, string> {
  if (!variables || !str) {
    return E.right(str)
  }

  let result = str
  let depth = 0
  let isSecret = false

  while (
    result.match(REGEX_NESTED_VAR) != null &&
    depth <= NESTED_MAX_EXPAND_LIMIT &&
    !isSecret
  ) {
    const previousResult = result
    
    result = decodeURI(encodeURI(result)).replace(REGEX_NESTED_VAR, (match, postmanVar, hoppVar) => {
      // Use the captured group that matched (either Postman or Hoppscotch syntax)
      const variableKey = postmanVar || hoppVar
      
      // First pass: resolve any nested variables within the key itself
      const resolvedKey = resolveNestedKey(variableKey, variables, depth)
      
      if (E.isLeft(resolvedKey)) {
        return match // Return original if resolution failed
      }
      
      const finalKey = resolvedKey.right.trim()
      
      // Check predefined variables first
      const foundPredefinedVar = HOPP_SUPPORTED_PREDEFINED_VARIABLES.find(
        (preVar) => preVar.key === finalKey
      )

      if (foundPredefinedVar) {
        return foundPredefinedVar.getValue()
      }

      // Find the variable in the environment
      const variable = variables.find((x) => x && x.key === finalKey)

      if (variable && "currentValue" in variable) {
        // Handle secret variables
        if (variable.secret && showKeyIfSecret) {
          isSecret = true
          return postmanVar ? `{{${finalKey}}}` : `<<${finalKey}>>`
        }
        
        if (variable.secret && maskValue) {
          return "*".repeat(
            (variable as {
              secret: true
              initialValue: string
              currentValue: string
              key: string
            }).currentValue.length
          )
        }
        
        return variable.currentValue
      }

      // Return empty string if variable not found (Postman behavior)
      return ""
    })
    
    // Break if no changes were made to prevent infinite loops
    if (result === previousResult) {
      break
    }
    
    depth++
  }

  return depth > NESTED_MAX_EXPAND_LIMIT
    ? E.left(NESTED_EXPAND_LOOP)
    : E.right(result)
}

/**
 * Resolves nested variables within a key itself
 * Example: "{{country-code}}{{environment}}" -> "USPRODUCTION"
 */
function resolveNestedKey(
  key: string,
  variables: Environment["variables"],
  currentDepth: number
): E.Either<typeof NESTED_EXPAND_LOOP, string> {
  if (currentDepth >= NESTED_MAX_EXPAND_LIMIT) {
    return E.left(NESTED_EXPAND_LOOP)
  }

  let resolvedKey = key
  let depth = 0

  while (
    resolvedKey.match(REGEX_NESTED_VAR) != null &&
    depth <= 5 && // Limit nested key resolution depth
    currentDepth + depth <= NESTED_MAX_EXPAND_LIMIT
  ) {
    const previousKey = resolvedKey
    
    resolvedKey = resolvedKey.replace(REGEX_NESTED_VAR, (match, postmanVar, hoppVar) => {
      const varKey = (postmanVar || hoppVar).trim()
      
      // Check predefined variables
      const foundPredefinedVar = HOPP_SUPPORTED_PREDEFINED_VARIABLES.find(
        (preVar) => preVar.key === varKey
      )

      if (foundPredefinedVar) {
        return foundPredefinedVar.getValue()
      }

      // Find in environment variables
      const variable = variables.find((x) => x && x.key === varKey)
      
      if (variable && "currentValue" in variable) {
        return variable.currentValue
      }
      
      return "" // Return empty if not found
    })
    
    // Break if no changes to prevent infinite loops
    if (resolvedKey === previousKey) {
      break
    }
    
    depth++
  }

  return E.right(resolvedKey)
}

/**
 * Backward compatibility function that tries nested parsing first, 
 * falls back to original parsing if needed
 */
export function parseTemplateStringWithNested(
  str: string,
  variables: Environment["variables"],
  maskValue = false,
  showKeyIfSecret = false
): E.Either<typeof NESTED_EXPAND_LOOP, string> {
  // Check if string contains Postman-style variables or potential nested patterns
  const hasPostmanSyntax = /\{\{.*\}\}/.test(str)
  const hasNestedPattern = /\{\{.*\{\{.*\}\}.*\}\}/.test(str) || /<<.*<<.*>>.*>>/.test(str)
  
  if (hasPostmanSyntax || hasNestedPattern) {
    return parseNestedTemplateString(str, variables, maskValue, showKeyIfSecret)
  }
  
  // Fall back to original parsing for backward compatibility
  return parseOriginalTemplateString(str, variables, maskValue, showKeyIfSecret)
}

/**
 * Original parsing function for backward compatibility
 */
function parseOriginalTemplateString(
  str: string,
  variables: Environment["variables"],
  maskValue = false,
  showKeyIfSecret = false
): E.Either<string, string> {
  // This would call the original parseTemplateStringE function
  // For now, we'll implement a simplified version
  const REGEX_ENV_VAR = /<<([^>]*)>>/g
  const ENV_MAX_EXPAND_LIMIT = 10
  
  if (!variables || !str) {
    return E.right(str)
  }

  let result = str
  let depth = 0
  let isSecret = false

  while (
    result.match(REGEX_ENV_VAR) != null &&
    depth <= ENV_MAX_EXPAND_LIMIT &&
    !isSecret
  ) {
    result = decodeURI(encodeURI(result)).replace(REGEX_ENV_VAR, (_, p1) => {
      const foundPredefinedVar = HOPP_SUPPORTED_PREDEFINED_VARIABLES.find(
        (preVar) => preVar.key === p1
      )

      if (foundPredefinedVar) {
        return foundPredefinedVar.getValue()
      }

      const variable = variables.find((x) => x && x.key === p1)

      if (variable && "currentValue" in variable) {
        if (variable.secret && showKeyIfSecret) {
          isSecret = true
          return `<<${p1}>>`
        }
        if (variable.secret && maskValue) {
          return "*".repeat(variable.currentValue.length)
        }
        return variable.currentValue
      }

      return ""
    })
    depth++
  }

  return depth > ENV_MAX_EXPAND_LIMIT
    ? E.left("ENV_EXPAND_LOOP")
    : E.right(result)
}