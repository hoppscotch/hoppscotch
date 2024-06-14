import * as E from "fp-ts/Either"
import { Ref } from "vue"

import {
  Environment,
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { Handle } from "./handle"
import {
  CollectionJSONView,
  CollectionLevelAuthHeadersView,
  RESTCollectionChildrenView,
  RootRESTCollectionView,
  SearchResultsView,
} from "./view"
import {
  Workspace,
  WorkspaceCollection,
  WorkspaceDecor,
  WorkspaceEnvironment,
  WorkspaceRequest,
} from "./workspace"

export interface WorkspaceProvider {
  providerID: string

  workspaceDecor?: Ref<WorkspaceDecor>

  // TODO: import/export API methods could be unified b/w REST & GQL perhaps taking in a `type` parameter

  getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, Handle<Workspace>>>
  getCollectionHandle(
    workspaceHandle: Handle<Workspace>,
    collectionID: string,
    type: "REST" | "GQL"
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  getRequestHandle(
    workspaceHandle: Handle<Workspace>,
    requestID: string,
    type: "REST" | "GQL"
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>>
  getRESTEnvironmentHandle(
    workspaceHandle: Handle<Workspace>,
    environmentID: number
  ): Promise<E.Either<unknown, Handle<WorkspaceEnvironment>>>

  getCollectionLevelAuthHeadersView(
    collectionHandle: Handle<WorkspaceCollection>,
    type: "REST" | "GQL"
  ): Promise<E.Either<never, Handle<CollectionLevelAuthHeadersView>>>
  getSearchResultsView(
    workspaceHandle: Handle<Workspace>,
    searchQuery: Ref<string>,
    type: "REST" | "GQL"
  ): Promise<E.Either<never, Handle<SearchResultsView>>>

  getRESTRootCollectionView(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<never, Handle<RootRESTCollectionView>>>
  getRESTCollectionChildrenView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<RESTCollectionChildrenView>>>
  getRESTCollectionJSONView(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<never, Handle<CollectionJSONView>>>

  createRESTRootCollection(
    workspaceHandle: Handle<Workspace>,
    newCollection: Partial<Exclude<HoppCollection, "id">> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  createRESTChildCollection(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  updateRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    updatedCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, void>>
  removeRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>>
  createRESTRequest(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>>
  updateRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    updatedRequest: Partial<HoppRESTRequest>
  ): Promise<E.Either<unknown, void>>
  removeRESTRequest(
    requestHandle: Handle<WorkspaceRequest>
  ): Promise<E.Either<unknown, void>>

  importRESTCollections(
    workspaceHandle: Handle<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, void>>
  exportRESTCollections(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<unknown, void>>
  exportRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>>

  reorderRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>>
  moveRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>>
  reorderRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationRequestID: string | null
  ): Promise<E.Either<unknown, void>>
  moveRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationCollectionID: string
  ): Promise<E.Either<unknown, void>>

  createGQLRootCollection(
    workspaceHandle: Handle<Workspace>,
    newCollection: Partial<Exclude<HoppCollection, "id">> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  createGQLChildCollection(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  updateGQLCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    updatedCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, void>>
  removeGQLCollection(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>>
  createGQLRequest(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newRequest: HoppGQLRequest
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>>
  updateGQLRequest(
    requestHandle: Handle<WorkspaceRequest>,
    updatedRequest: Partial<HoppGQLRequest>
  ): Promise<E.Either<unknown, void>>
  removeGQLRequest(
    requestHandle: Handle<WorkspaceRequest>
  ): Promise<E.Either<unknown, void>>

  moveGQLRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationCollectionID: string
  ): Promise<E.Either<unknown, void>>

  importGQLCollections(
    workspaceHandle: Handle<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, void>>
  exportGQLCollections(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<unknown, void>>

  createRESTEnvironment(
    workspaceHandle: Handle<Workspace>,
    newEnvironment: Partial<Environment> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceEnvironment>>>
  duplicateRESTEnvironment(
    environmentHandle: Handle<WorkspaceEnvironment>
  ): Promise<E.Either<unknown, Handle<WorkspaceEnvironment>>>
  updateRESTEnvironment(
    environmentHandle: Handle<WorkspaceEnvironment>,
    updatedEnvironment: Partial<Environment>
  ): Promise<E.Either<unknown, void>>
  removeRESTEnvironment(
    environmentHandle: Handle<WorkspaceEnvironment>
  ): Promise<E.Either<unknown, void>>
}
