import { Ref } from "vue"
import * as E from "fp-ts/Either"
import { HandleRef } from "./handle"
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
} from "./view"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"

export interface WorkspaceProvider {
  providerID: string

  workspaceDecor?: Ref<WorkspaceDecor>

  getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, HandleRef<Workspace>>>
  getCollectionHandle(
    workspaceHandle: HandleRef<Workspace>,
    collectionID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  getRequestHandle(
    workspaceHandle: HandleRef<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>>

  getRESTRootCollectionView(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<unknown, HandleRef<RootRESTCollectionView>>>
  getRESTCollectionChildrenView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<RESTCollectionChildrenView>>>
  getRESTCollectionLevelAuthHeadersView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<RESTCollectionLevelAuthHeadersView>>>
  getRESTSearchResultsView(
    workspaceHandle: HandleRef<Workspace>,
    searchQuery: Ref<string>
  ): Promise<E.Either<unknown, HandleRef<RESTSearchResultsView>>>

  createRESTRootCollection(
    workspaceHandle: HandleRef<Workspace>,
    newCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  createRESTChildCollection(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
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
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>>
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
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
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
    destinationCollectionIndex: string | null
  ): Promise<E.Either<unknown, void>>
  moveRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    destinationCollectionIndex: string | null
  ): Promise<E.Either<unknown, void>>
  reorderRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    destinationCollectionIndex: string,
    destinationRequestIndex: string | null
  ): Promise<E.Either<unknown, void>>
  moveRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    destinationCollectionIndex: string
  ): Promise<E.Either<unknown, void>>
}
