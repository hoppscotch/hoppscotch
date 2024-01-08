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
