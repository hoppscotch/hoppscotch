//versioned entity definitions for global environments
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { InferredEntity, createVersionedEntity } from "verzod"

import { z } from "zod"

import V0_VERSION from "./v/0"
import V1_VERSION from "./v/1"

const versionedObject = z.object({
  v: z.number(),
})

export const GlobalEnvironment = createVersionedEntity({
  latestVersion: 1,
  versionMap: {
    0: V0_VERSION,
    1: V1_VERSION,
  },
  getVersion(data) {
    const versionCheck = versionedObject.safeParse(data)

    if (versionCheck.success) return versionCheck.data.v

    // For V0 we have to check the schema
    const result = V0_VERSION.schema.safeParse(data)
    return result.success ? 0 : null
  },
})

export type GlobalEnvironment = InferredEntity<typeof GlobalEnvironment>

export type GlobalEnvironmentVariable = InferredEntity<
  typeof GlobalEnvironment
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

export const GlobalEnvironmentSchemaVersion = 1

export function parseBodyGlobalEnvVariablesE(
  body: string,
  env: GlobalEnvironment["variables"]
) {
  let result = body
  let depth = 0

  while (result.match(REGEX_ENV_VAR) != null && depth <= ENV_MAX_EXPAND_LIMIT) {
    result = result.replace(REGEX_ENV_VAR, (key) => {
      const found = env.find(
        (envVar) => envVar.key === key.replace(/[<>]/g, "")
      )

      if (found && "value" in found) {
        return found.value
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
export const parseBodyGlobalEnvVariables = (
  body: string,
  env: GlobalEnvironment["variables"]
) =>
  pipe(
    parseBodyGlobalEnvVariablesE(body, env),
    E.getOrElse(() => body)
  )

export function parseGETemplateStringE(
  str: string,
  variables:
    | GlobalEnvironment["variables"]
    | { secret: true; value: string; key: string }[],
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
      const variable = variables.find((x) => x && x.key === p1)

      if (variable && "value" in variable) {
        // Show the key if it is a secret and explicitly specified
        if (variable.secret && showKeyIfSecret) {
          isSecret = true
          return `<<${p1}>>`
        }
        // Mask the value if it is a secret and explicitly specified
        if (variable.secret && maskValue) {
          return "*".repeat(
            (variable as { secret: true; value: string; key: string }).value
              .length
          )
        }
        return variable.value
      }

      return ""
    })
    depth++
  }

  return depth > ENV_MAX_EXPAND_LIMIT
    ? E.left(ENV_EXPAND_LOOP)
    : E.right(result)
}

export type NonSecretGlobalEnvironmentVariable = Extract<
  GlobalEnvironmentVariable,
  { secret: false }
>

export type NonSecretGlobalEnvironment = Omit<GlobalEnvironment, "variables"> & {
  variables: NonSecretGlobalEnvironmentVariable[]
}

/**
 * @deprecated Use `parseGETemplateStringE` instead
 */
export const parseGETemplateString = (
  str: string,
  variables:
    | GlobalEnvironment["variables"]
    | { secret: true; value: string; key: string }[],
  maskValue = false,
  showKeyIfSecret = false
) =>
  pipe(
    parseGETemplateStringE(str, variables, maskValue, showKeyIfSecret),
    E.getOrElse(() => str)
  )

export const translateToNewGlobalEnvironmentVariables = (
  x: any
): GlobalEnvironment["variables"][number] => {
  return {
    key: x.key,
    value: x.value,
    secret: false,
  }
}

export const translateToNewGlobalEnvironment = (x: any): GlobalEnvironment => {
  if (x.v && x.v === GlobalEnvironmentSchemaVersion) return x

  // Legacy
  const name = x.name ?? "Untitled"
  const variables = (x.variables ?? []).map(translateToNewGlobalEnvironmentVariables)

  return {
    v: GlobalEnvironmentSchemaVersion,
    variables,
  }
}
