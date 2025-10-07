import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { InferredEntity, createVersionedEntity } from "verzod"

import { z } from "zod"

import V0_VERSION from "./v/0"
import V1_VERSION, { uniqueID } from "./v/1"
import V2_VERSION from "./v/2"
import { HOPP_SUPPORTED_PREDEFINED_VARIABLES } from "../predefinedVariables"

const versionedObject = z.object({
  v: z.number(),
})

export const Environment = createVersionedEntity({
  latestVersion: 2,
  versionMap: {
    0: V0_VERSION,
    1: V1_VERSION,
    2: V2_VERSION,
  },
  getVersion(data) {
    const versionCheck = versionedObject.safeParse(data)

    if (versionCheck.success) return versionCheck.data.v

    // For V0 we have to check the schema
    const result = V0_VERSION.schema.safeParse(data)
    return result.success ? 0 : null
  },
})

export type Environment = InferredEntity<typeof Environment>

export type EnvironmentVariable = InferredEntity<
  typeof Environment
>["variables"][number]

const REGEX_ENV_VAR = /<<([^>]*)>>/g // "<<myVariable>>"

/**
 * How much times can we expand environment variables
 */
const ENV_MAX_EXPAND_LIMIT = 10

/**
 * Error state when there is a suspected loop while
 * recursively expanding variables
 */
const ENV_EXPAND_LOOP = "ENV_EXPAND_LOOP" as const

export const EnvironmentSchemaVersion = 2

export function parseBodyEnvVariablesE(
  body: string,
  env: Environment["variables"]
) {
  let result = body
  let depth = 0

  while (result.match(REGEX_ENV_VAR) != null && depth <= ENV_MAX_EXPAND_LIMIT) {
    result = result.replace(REGEX_ENV_VAR, (key) => {
      const variableName = key.replace(/[<>]/g, "")

      // Prioritise predefined variable values over normal environment variables processing.
      const foundPredefinedVar = HOPP_SUPPORTED_PREDEFINED_VARIABLES.find(
        (preVar) => preVar.key === variableName
      )

      if (foundPredefinedVar) {
        return foundPredefinedVar.getValue()
      }

      const foundEnv = env.find((envVar) => envVar.key === variableName)

      if (foundEnv && "currentValue" in foundEnv) {
        return foundEnv.currentValue
      }
      return key
    })

    depth++
  }

  return depth > ENV_MAX_EXPAND_LIMIT
    ? E.left(ENV_EXPAND_LOOP)
    : E.right(result)
}

/**
 * @deprecated Use `parseBodyEnvVariablesE` instead.
 */
export const parseBodyEnvVariables = (
  body: string,
  env: Environment["variables"]
) =>
  pipe(
    parseBodyEnvVariablesE(body, env),
    E.getOrElse(() => body)
  )

// Enhanced regex to support both Hoppscotch (<<>>) and Postman ({{}}) syntaxes
const REGEX_POSTMAN_VAR = /\{\{([^}]*)\}\}/g

/**
 * Enhanced parser that supports both Hoppscotch and Postman syntax including nested variables
 * Supports Postman-style nested syntax: {{ {{country-code}}{{environment}} }}
 */
export function parseTemplateStringE(
  str: string,
  variables: Environment["variables"],
  maskValue = false,
  showKeyIfSecret = false
) {
  // Check if string contains Postman-style variables or nested patterns
  const hasPostmanSyntax = REGEX_POSTMAN_VAR.test(str)
  const hasNestedPattern = /\{\{.*\{\{.*\}\}.*\}\}/.test(str) || /<<.*<<.*>>.*>>/.test(str)
  
  if (hasPostmanSyntax || hasNestedPattern) {
    return parseNestedTemplateString(str, variables, maskValue, showKeyIfSecret)
  }
  
  // Original Hoppscotch parsing for backward compatibility
  return parseOriginalHoppscotchTemplate(str, variables, maskValue, showKeyIfSecret)
}

/**
 * Enhanced nested template parser supporting Postman-style nested variables
 */
function parseNestedTemplateString(
  str: string,
  variables: Environment["variables"],
  maskValue = false,
  showKeyIfSecret = false
) {
  if (!variables || !str) {
    return E.right(str)
  }

  // Combined regex for both syntaxes
  const REGEX_COMBINED_VAR = /\{\{([^}]*)\}\}|<<([^>]*)>>/g
  const NESTED_MAX_EXPAND_LIMIT = 15 // Increased limit for nested resolution
  
  let result = str
  let depth = 0
  let isSecret = false

  while (
    result.match(REGEX_COMBINED_VAR) != null &&
    depth <= NESTED_MAX_EXPAND_LIMIT &&
    !isSecret
  ) {
    const previousResult = result
    
    result = decodeURI(encodeURI(result)).replace(REGEX_COMBINED_VAR, (match, postmanVar, hoppVar) => {
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
    ? E.left(ENV_EXPAND_LOOP)
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
) {
  if (currentDepth >= 15) {
    return E.left(ENV_EXPAND_LOOP)
  }

  const REGEX_COMBINED_VAR = /\{\{([^}]*)\}\}|<<([^>]*)>>/g
  let resolvedKey = key
  let depth = 0

  while (
    resolvedKey.match(REGEX_COMBINED_VAR) != null &&
    depth <= 5 && // Limit nested key resolution depth
    currentDepth + depth <= 15
  ) {
    const previousKey = resolvedKey
    
    resolvedKey = resolvedKey.replace(REGEX_COMBINED_VAR, (match, postmanVar, hoppVar) => {
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
 * Original Hoppscotch template parsing for backward compatibility
 */
function parseOriginalHoppscotchTemplate(
  str: string,
  variables: Environment["variables"],
  maskValue = false,
  showKeyIfSecret = false
) {
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
      // Prioritise predefined variable values over normal environment variables processing.
      const foundPredefinedVar = HOPP_SUPPORTED_PREDEFINED_VARIABLES.find(
        (preVar) => preVar.key === p1
      )

      if (foundPredefinedVar) {
        return foundPredefinedVar.getValue()
      }

      const variable = variables.find((x) => x && x.key === p1)

      if (variable && "currentValue" in variable) {
        // Show the key if it is a secret and explicitly specified
        if (variable.secret && showKeyIfSecret) {
          isSecret = true
          return `<<${p1}>>`
        }
        // Mask the value if it is a secret and explicitly specified
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

      return ""
    })
    depth++
  }

  return depth > ENV_MAX_EXPAND_LIMIT
    ? E.left(ENV_EXPAND_LOOP)
    : E.right(result)
}

export type NonSecretEnvironmentVariable = Extract<
  EnvironmentVariable,
  { secret: false }
>

export type NonSecretEnvironment = Omit<Environment, "variables"> & {
  variables: NonSecretEnvironmentVariable[]
}

/**
 * @deprecated Use `parseTemplateStringE` instead
 */
export const parseTemplateString = (
  str: string,
  variables: Environment["variables"],
  maskValue = false,
  showKeyIfSecret = false
) =>
  pipe(
    parseTemplateStringE(str, variables, maskValue, showKeyIfSecret),
    E.getOrElse(() => str)
  )

export const translateToNewEnvironmentVariables = (
  x: any
): Environment["variables"][number] => {
  return {
    key: x.key,
    initialValue: x.initialValue ?? x.value ?? "",
    currentValue: x.currentValue ?? x.value ?? "",
    secret: x.secret ?? false,
  }
}

export const translateToNewEnvironment = (x: any): Environment => {
  if (x.v && x.v === EnvironmentSchemaVersion) return x

  // Legacy
  const id = x.id || uniqueID()
  const name = x.name ?? "Untitled"
  const variables = (x.variables ?? []).map(translateToNewEnvironmentVariables)

  return {
    v: EnvironmentSchemaVersion,
    id,
    name,
    variables,
  }
}
