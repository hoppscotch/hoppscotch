import { HoppGQLRequest, ValidContentTypes } from "@hoppscotch/data"
import * as Eq from "fp-ts/Eq"
import * as N from "fp-ts/number"
import * as S from "fp-ts/string"
import { lodashIsEqualEq, mapThenEq, undefinedEq } from "./eq"

export type HoppGQLParam = {
  key: string
  value: string
  active: boolean
}

export type HoppGQLHeader = {
  key: string
  value: string
  active: boolean
}

export type FormDataKeyValue = {
  key: string
  active: boolean
} & ({ isFile: true; value: Blob[] } | { isFile: false; value: string })

export type HoppGQLReqBodyFormData = {
  contentType: "multipart/form-data"
  body: FormDataKeyValue[]
}

export type HoppGQLReqBody =
  | {
      contentType: Exclude<ValidContentTypes, "multipart/form-data">
      body: string
    }
  | HoppGQLReqBodyFormData
  | {
      contentType: null
      body: null
    }

export const HoppGQLRequestEq = Eq.struct<HoppGQLRequest>({
  id: undefinedEq(S.Eq),
  v: N.Eq,
  name: S.Eq,
  url: S.Eq,
  headers: mapThenEq(
    (arr) => arr.filter((h) => h.key !== "" && h.value !== ""),
    lodashIsEqualEq
  ),
  query: S.Eq,
  variables: S.Eq,
  auth: lodashIsEqualEq,
})

export const isEqualHoppGQLRequest = HoppGQLRequestEq.equals
