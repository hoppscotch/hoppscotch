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

export function parseTemplateStringEV(
  str: string,
  variables: Environment["variables"],
  myVariables: Variables
) {
  if (!variables || !str || !myVariables) {
    return E.right(str)
  }

  let result = str
  let depth = 0
  let errorBound = 0

  while (result.match(REGEX_ENV_VAR) != null && depth <= ENV_MAX_EXPAND_LIMIT) {
    result = decodeURI(encodeURI(result)).replace(
      REGEX_ENV_VAR,
      (_, p1) => variables.find((x) => x.key === p1)?.value || ""
    )
    depth++
  }

  /**
   * TODO: Create an error statement for variables
   */
  while (result.match(REGEX_MY_VAR) != null && errorBound <= ENV_MAX_EXPAND_LIMIT) {
    result = decodeURI(encodeURI(result)).replace(
      REGEX_MY_VAR,
      (_, p1) => myVariables.find((x) => x.key === p1)?.value || ""
    )
    errorBound++
  }

  if (depth <= ENV_MAX_EXPAND_LIMIT && errorBound <= ENV_MAX_EXPAND_LIMIT) {
    return E.right(result)
  } else {
    return E.left(ENV_EXPAND_LOOP)
  }
}

/**
 * @deprecated Use `parseTemplateStringEV` instead
 */
export const parseTemplateStringV = (
  str: string,
  variables: Environment["variables"],
  myVariables: Variables
) =>
  pipe(
    parseTemplateStringEV(str, variables, myVariables),
    E.getOrElse(() => str)
  )
