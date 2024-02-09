import { Ref } from "vue"
import * as E from "fp-ts/Either"
import { HandleRef } from "./handle"
import {
  Workspace,
  WorkspaceCollection,
  WorkspaceDecor,
  WorkspaceRequest,
} from "./workspace"
import { RESTCollectionChildrenView, RootRESTCollectionView } from "./view"
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
  // getRESTCollectionAuthHeaders(
  //   collectionHandle: HandleRef<WorkspaceCollection>
  // ): Promise<E.Either<unknown, HandleRef<RESTCollectionAuthHeadersView>>>

  createRESTRootCollection(
    workspaceHandle: HandleRef<Workspace>,
    collectionName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  createRESTChildCollection(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    collectionName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  editRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    updatedCollection: HoppCollection
  ): Promise<E.Either<unknown, HandleRef<boolean>>>
  removeRESTRootCollection(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<boolean>>>
  removeRESTChildCollection(
    parentCollectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<boolean>>>
  createRESTRequest(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    requestName: string,
    openInNewTab: boolean
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  updateRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    updatedRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<boolean>>>
  removeRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>
  ): Promise<E.Either<unknown, HandleRef<boolean>>>
}
