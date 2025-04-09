import { HoppRESTRequestVariables } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"

export const filterActiveToRecord = (
  headers: HoppRESTRequestVariables
): Record<string, string> =>
  pipe(
    headers,
    A.filter((header) => header.active),
    A.map((header): [string, string] => [header.key, header.value]),
    (entries) => Object.fromEntries(entries)
  )

export const filterParamsActiveToRecord = (params: HoppRESTRequestVariables) =>
  pipe(
    params,
    A.filter((param) => param.active),
    A.map((param): [string, string] => [param.key, param.value])
  )
