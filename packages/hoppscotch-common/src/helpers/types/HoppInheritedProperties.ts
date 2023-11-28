import { HoppRESTRequest } from "@hoppscotch/data"

export type HoppInheritedProperty = {
  parentId: string
  parentName: string
  auth?: HoppRESTRequest["auth"]
  headers?: HoppRESTRequest["headers"]
}
