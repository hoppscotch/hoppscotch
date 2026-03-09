import { HoppRESTRequestVariables } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"

export const filterActiveToRecord = (
  variables: HoppRESTRequestVariables
): Record<string, string> =>
  pipe(
    variables,
    A.filter((variable) => variable.active),
    A.map((variable): [string, string] => [variable.key, variable.value]),
    (entries) => Object.fromEntries(entries)
  )

export const filterActiveParams = (params: HoppRESTRequestVariables) =>
  pipe(
    params,
    A.filter((param) => param.active),
    A.map((param): [string, string] => [param.key, param.value])
  )
