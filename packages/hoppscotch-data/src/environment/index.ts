import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
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

/**
 * Resolves the effective value of an environment variable while expanding
 * `<<var>>` templates: the current value is what's in use, but an empty current
 * value falls back to the initial value (which acts as the default).
 *
 * This is the single place the current→initial fallback lives for execution /
 * resolution. Surfaces that display the raw current value must NOT go through
 * here — they read `currentValue` directly so an empty value stays empty.
 */
const getResolvedVariableValue = (variable: {
  currentValue?: string
  initialValue?: string
}): string => variable.currentValue || variable.initialValue || ""

/**
 * Runs one pass of `<<var>>` substitution over a request body
 */
const expandBodyEnvVariablesOnce = (
  body: string,
  env: Environment["variables"],
  keepMissingAsKey: boolean
) =>
  body.replace(REGEX_ENV_VAR, (key) => {
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
      return getResolvedVariableValue(foundEnv)
    }
    return keepMissingAsKey ? key : ""
  })

/**
 * Expands body variables until a pass changes nothing. Returns `None` when
 * the body keeps changing past `ENV_MAX_EXPAND_LIMIT` (variables that
 * reference each other in a loop)
 */
const expandBodyEnvVariables = (
  body: string,
  env: Environment["variables"],
  keepMissingAsKey: boolean
): O.Option<string> => {
  let result = body

  for (let depth = 0; depth <= ENV_MAX_EXPAND_LIMIT; depth++) {
    const next = expandBodyEnvVariablesOnce(result, env, keepMissingAsKey)

    if (next === result) return O.some(result)

    result = next
  }

  return O.none
}

export function parseBodyEnvVariablesE(
  body: string,
  env: Environment["variables"],
  // Missing vars stay as literal `<<key>>` by default (long-standing body
  // behavior); pass false to resolve them to "" like parseTemplateStringE
  keepMissingAsKey = true
) {
  // Strict: anything left unresolved (a missing var kept as `<<key>>`, or a
  // loop) is reported as ENV_EXPAND_LOOP
  return pipe(
    expandBodyEnvVariables(body, env, keepMissingAsKey),
    O.filter((result) => result.match(REGEX_ENV_VAR) == null),
    E.fromOption(() => ENV_EXPAND_LOOP)
  )
}

/**
 * Resolves body variables, keeping missing ones as `<<key>>` (unless
 * `keepMissingAsKey` is false) while still resolving the rest of the body.
 * Returns the body unchanged when variables reference each other in a loop.
 *
 * @deprecated Use `parseBodyEnvVariablesE` instead.
 */
export const parseBodyEnvVariables = (
  body: string,
  env: Environment["variables"],
  keepMissingAsKey = true
) =>
  pipe(
    expandBodyEnvVariables(body, env, keepMissingAsKey),
    O.getOrElse(() => body)
  )

export function parseTemplateStringE(
  str: string,
  variables: Environment["variables"],
  maskValue = false,
  showKeyIfSecret = false,
  showKeyIfNotFound = false
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
    const currentResult = decodeURI(encodeURI(result)).replace(
      REGEX_ENV_VAR,
      (_, p1) => {
        // Prioritise predefined variable values over normal environment variables processing.
        const foundPredefinedVar = HOPP_SUPPORTED_PREDEFINED_VARIABLES.find(
          (preVar) => preVar.key === p1
        )

        if (foundPredefinedVar) {
          return foundPredefinedVar.getValue()
        }

        const variable = variables.find((x) => x && x.key === p1)

        if (variable && "currentValue" in variable) {
          // Current value in use, falling back to the initial value when empty.
          const resolvedValue = getResolvedVariableValue(variable)

          // Show the key if it is a secret and explicitly specified
          if (variable.secret && showKeyIfSecret) {
            isSecret = true
            return `<<${p1}>>`
          }
          // Mask the value if it is a secret and explicitly specified
          if (variable.secret && maskValue) {
            return "*".repeat(resolvedValue.length)
          }
          return resolvedValue
        }

        if (showKeyIfNotFound) {
          return `<<${p1}>>`
        }

        return ""
      }
    )

    if (currentResult === result) {
      break
    }

    result = currentResult
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
  showKeyIfSecret = false,
  showKeyIfNotFound = false
) =>
  pipe(
    parseTemplateStringE(
      str,
      variables,
      maskValue,
      showKeyIfSecret,
      showKeyIfNotFound
    ),
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
