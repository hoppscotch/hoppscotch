import {
  GQLHeader,
  HoppGQLAuth,
  HoppRESTHeader,
  HoppRESTAuth,
} from "@hoppscotch/data"

export type HoppInheritedProperty = {
  auth: {
    parentID: string
    parentName: string
    inheritedAuth: HoppRESTAuth | HoppGQLAuth
  }
  headers: {
    parentID: string
    parentName: string
    inheritedHeader: HoppRESTHeader | GQLHeader
  }[]
}

type ModifiedAuth<T, AuthType> = {
  [K in keyof T]: K extends "inheritedAuth" ? Extract<T[K], AuthType> : T[K]
}

type ModifiedHeaders<T, HeaderType> = {
  [K in keyof T]: K extends "inheritedHeader" ? Extract<T[K], HeaderType> : T[K]
}

type ModifiedHoppInheritedProperty<AuthType, HeaderType> = {
  auth: ModifiedAuth<HoppInheritedProperty["auth"], AuthType>
  headers: ModifiedHeaders<
    HoppInheritedProperty["headers"][number],
    HeaderType
  >[]
}

export type HoppInheritedRESTProperty = ModifiedHoppInheritedProperty<
  HoppRESTAuth,
  HoppRESTHeader
>
