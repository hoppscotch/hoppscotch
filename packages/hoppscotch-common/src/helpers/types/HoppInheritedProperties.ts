import { HoppRESTRequest } from "@hoppscotch/data"

export type HoppInheritedProperty = {
  auth: {
    parentID: string
    parentName: string
    inheritedAuth: HoppRESTRequest["auth"]
  }
  headers: {
    parentID: string
    parentName: string
    inheritedHeader?: HoppRESTRequest["headers"][number]
  }[]
}
