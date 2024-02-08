import { HoppRESTRequest } from "@hoppscotch/data"
import { Ref } from "vue"

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

  mayHaveMoreContent: Ref<boolean>
  loading: Ref<boolean>

  collections: Ref<RESTCollectionViewCollection[]>

  loadMore(count: number): Promise<void>
}

export interface RESTCollectionChildrenView {
  providerID: string
  workspaceID: string
  collectionID: string

  mayHaveMoreContent: Ref<boolean>
  loading: Ref<boolean>

  content: Ref<RESTCollectionViewItem[]>

  loadMore(count: number): Promise<void>
}
