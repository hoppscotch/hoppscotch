import { Ref } from "vue"
import * as E from "fp-ts/Either"
import { HandleRef } from "./handle"
import { Workspace, WorkspaceCollection, WorkspaceDecor } from "./workspace"
import { RESTCollectionChildrenView, RootRESTCollectionView } from "./view"
import { HoppRESTRequest } from "@hoppscotch/data"

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

  getRESTRootCollectionView(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<unknown, HandleRef<RootRESTCollectionView>>>
  getRESTCollectionChildrenView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<RESTCollectionChildrenView>>>

  createRESTRootCollection(
    workspaceHandle: HandleRef<Workspace>,
    collectionName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  createRESTChildCollection(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collectionName: string,
    path: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  createRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    requestName: string,
    path: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  removeRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    path: string,
    requestIndex: number
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  selectRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collPath: string,
    requestIndex: string,
    request: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  duplicateRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collPath: string,
    request: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  editRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collPath: string,
    requestIndex: number,
    request: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
}
