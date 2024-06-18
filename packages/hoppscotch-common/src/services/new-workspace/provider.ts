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
  RESTEnvironmentsView,
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

  getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, Handle<Workspace>>>

  getRESTCollectionHandle(
    workspaceHandle: Handle<Workspace>,
    collectionID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  getRESTRequestHandle(
    workspaceHandle: Handle<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>>
  getRESTEnvironmentHandle(
    workspaceHandle: Handle<Workspace>,
    environmentID: number
  ): Promise<E.Either<unknown, Handle<WorkspaceEnvironment>>>

  getRESTCollectionLevelAuthHeadersView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<CollectionLevelAuthHeadersView>>>
  getRESTSearchResultsView(
    workspaceHandle: Handle<Workspace>,
    searchQuery: Ref<string>
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
  getRESTEnvironmentsView(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<never, Handle<RESTEnvironmentsView>>>

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

  getGQLCollectionHandle(
    workspaceHandle: Handle<Workspace>,
    collectionID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>>
  getGQLRequestHandle(
    workspaceHandle: Handle<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>>

  getGQLCollectionLevelAuthHeadersView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<CollectionLevelAuthHeadersView>>>
  getGQLSearchResultsView(
    workspaceHandle: Handle<Workspace>,
    searchQuery: Ref<string>
  ): Promise<E.Either<never, Handle<SearchResultsView>>>

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

  importRESTEnvironments(
    workspaceHandle: Handle<Workspace>,
    environments: Environment[]
  ): Promise<E.Either<unknown, void>>
  exportRESTEnvironments(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<unknown, void>>
  exportRESTEnvironment(
    environmentHandle: Handle<WorkspaceEnvironment>
  ): Promise<E.Either<unknown, void>>
}
