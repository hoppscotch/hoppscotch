import { HoppRESTRequest } from "@hoppscotch/data"
import { Ref } from "vue"
import { HoppInheritedRESTProperty } from "~/helpers/types/HoppInheritedProperties"

export type RESTCollectionLevelAuthHeadersView = {
  auth: HoppInheritedRESTProperty["auth"]
  headers: HoppInheritedRESTProperty["headers"]
}

export type RESTCollectionViewCollection = {
  collectionID: string

  name: string
}

export type RESTCollectionViewRequest = {
  collectionID: string
  requestID: string

  request: HoppRESTRequest
}

export type RESTCollectionViewItem =
  | { type: "collection"; value: RESTCollectionViewCollection }
  | { type: "request"; value: RESTCollectionViewRequest }

export interface RootRESTCollectionView {
  providerID: string
  workspaceID: string

  loading: Ref<boolean>

  collections: Ref<RESTCollectionViewCollection[]>
}

export interface RESTCollectionChildrenView {
  providerID: string
  workspaceID: string
  collectionID: string

  loading: Ref<boolean>

  content: Ref<RESTCollectionViewItem[]>
}
