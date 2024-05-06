import { Ref } from "vue"
import * as E from "fp-ts/Either"

import { Handle, HandleRef } from "./handle"
import {
  Workspace,
  WorkspaceCollection,
  WorkspaceDecor,
  WorkspaceRequest,
} from "./workspace"
import {
  RESTCollectionLevelAuthHeadersView,
  RESTCollectionChildrenView,
  RootRESTCollectionView,
  RESTSearchResultsView,
  RESTCollectionJSONView,
} from "./view"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"

export interface WorkspaceProvider {
  providerID: string

  workspaceDecor?: Ref<WorkspaceDecor>

  getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, Handle<Workspace>>>
  getCollectionHandle(
    workspaceHandle: HandleRef<Workspace>,
    collectionID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  getRequestHandle(
    workspaceHandle: HandleRef<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>>

  getRESTRootCollectionView(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<never, Handle<RootRESTCollectionView>>>
  getRESTCollectionChildrenView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<RESTCollectionChildrenView>>>
  getRESTCollectionLevelAuthHeadersView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<RESTCollectionLevelAuthHeadersView>>>
  getRESTSearchResultsView(
    workspaceHandle: HandleRef<Workspace>,
    searchQuery: Ref<string>
  ): Promise<E.Either<never, Handle<RESTSearchResultsView>>>
  getRESTCollectionJSONView(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<never, Handle<RESTCollectionJSONView>>>

  createRESTRootCollection(
    workspaceHandle: HandleRef<Workspace>,
    newCollection: Partial<Exclude<HoppCollection, "id">> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  createRESTChildCollection(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  updateRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    updatedCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, void>>
  removeRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>>
  createRESTRequest(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    newRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>>
  updateRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    updatedRequest: Partial<HoppRESTRequest>
  ): Promise<E.Either<unknown, void>>
  removeRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>
  ): Promise<E.Either<unknown, void>>

  importRESTCollections(
    workspaceHandle: HandleRef<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  exportRESTCollections(
    workspaceHandle: HandleRef<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, void>>
  exportRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    collection: HoppCollection
  ): Promise<E.Either<unknown, void>>

  reorderRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>>
  moveRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>>
  reorderRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    destinationCollectionID: string,
    destinationRequestID: string | null
  ): Promise<E.Either<unknown, void>>
  moveRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    destinationCollectionID: string
  ): Promise<E.Either<unknown, void>>
}
