import { pipe } from "fp-ts/function"
import * as E from "fp-ts/Either"

export type Environment = {
  name: string
  variables: {
    key: string
    value: string
  }[]
}

export type Variables = {
  key: string
  value: string
}[]

const REGEX_ENV_VAR = /<<([^>]*)>>/g // "<<myVariable>>"
const REGEX_MY_VAR = /{{([^}]*)}}/g // "{{myVariable}}"

/**
 * How much times can we expand environment variables
 */
const ENV_MAX_EXPAND_LIMIT = 10

/**
 * Error state when there is a suspected loop while
 * recursively expanding variables
 */
const ENV_EXPAND_LOOP = "ENV_EXPAND_LOOP" as const

export function parseBodyEnvVariablesE(
  body: string,
  env: Environment["variables"]
) {
  let result = body
  let depth = 0

  while (result.match(REGEX_ENV_VAR) != null && depth <= ENV_MAX_EXPAND_LIMIT) {
    result = result.replace(/<<\w+>>/g, (key) => {
      const found = env.find(
        (envVar) => envVar.key === key.replace(/[<>]/g, "")
      )
      return found ? found.value : key
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

export function parseTemplateStringE(
  str: string,
  variables: Environment["variables"],
  myVariables?: Variables | undefined
) {

  if (!variables || !str) {
    return E.right(str)
  }

  let result = str
  let depthEnv = 0
  let depthVar = 0

  while (result.match(REGEX_ENV_VAR) != null && depthEnv <= ENV_MAX_EXPAND_LIMIT) {
    result = decodeURI(encodeURI(result)).replace(
      REGEX_ENV_VAR,
      (_, p1) => variables.find((x) => x.key === p1)?.value || ""
    )
    depthEnv++
  }

  if (myVariables) {
    while (result.match(REGEX_MY_VAR) != null && depthVar <= ENV_MAX_EXPAND_LIMIT) {
      result = decodeURI(encodeURI(result)).replace(
        REGEX_MY_VAR,
        (_, p1) => myVariables.find((x) => x.key === p1)?.value || ""
      )
      depthVar++
    }
  }

  return depthEnv <= ENV_MAX_EXPAND_LIMIT && depthVar <= ENV_MAX_EXPAND_LIMIT ? E.right(result) : E.left(ENV_EXPAND_LOOP);
}

/**
 * @deprecated Use `parseTemplateStringE` instead
 */
export const parseTemplateString = (
  str: string,
  variables: Environment["variables"],
  myVariables?: Variables
) =>
  pipe(
    parseTemplateStringE(str, variables, myVariables),
    E.getOrElse(() => str)
  )
