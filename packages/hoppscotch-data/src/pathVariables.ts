import { pipe } from "fp-ts/function"
import * as E from "fp-ts/Either"
import {parseTemplateStringE} from "./environment";

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

const REGEX_PATH_VAR = /{{([^>]*)}}/g // "{{myVariable}}"

/**
 * How much times can we expand environment variables
 */
const ENV_MAX_EXPAND_LIMIT = 10

/**
 * Error state when there is a suspected loop while
 * recursively expanding variables
 */
const REGEX_ENV_VAR = /<<([^>]*)>>/g // "<<myVariable>>"
const ENV_EXPAND_LOOP = "ENV_EXPAND_LOOP" as const


export function parseTemplateStringEV(
  str: string,
  variables: Environment["variables"],
  pathVariables : Variables
) {
  if (!variables || !str || !pathVariables) {
    return E.right(str)
  }

  let result = str
  let depth = 0

  while (result.match(REGEX_ENV_VAR) != null && depth <= ENV_MAX_EXPAND_LIMIT) {
    result = decodeURI(encodeURI(result)).replace(
      REGEX_ENV_VAR,
      (_, p1) => variables.find((x) => x.key === p1)?.value || ""
    )
    depth++
  }
  while (result.match(REGEX_PATH_VAR) != null && depth <= ENV_MAX_EXPAND_LIMIT) {
    result = decodeURI(encodeURI(result)).replace(
      REGEX_ENV_VAR,
      (_, p1) => pathVariables.find((x) => x.key === p1)?.value || ""
    )
  }
  return depth > ENV_MAX_EXPAND_LIMIT
    ? E.left(ENV_EXPAND_LOOP)
    : E.right(result)
}

/**
 * @deprecated Use `parseTemplateStringE` instead
 */

export const parseTemplateStringV = (
  str: string,
  variables: Environment["variables"],
  pathVariables: Variables
) =>
  pipe(
    parseTemplateStringEV(str, variables, pathVariables),
    E.getOrElse(() => str)
  )
