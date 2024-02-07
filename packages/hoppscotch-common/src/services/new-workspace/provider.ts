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
import { HoppRESTAuth, HoppRESTHeaders, HoppRESTRequest } from "@hoppscotch/data"

export type UpdatedCollectionProperties = {
  auth: HoppRESTAuth
  headers: HoppRESTHeaders
}

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
    parentCollHandle: HandleRef<WorkspaceCollection>,
    requestID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>>

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
    collectionName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  editRESTRootCollection(
    collHandle: HandleRef<WorkspaceCollection>,
    newCollectionName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  editRESTChildCollection(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    newCollectionName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  editRESTCollectionProperties(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    updatedCollProps: UpdatedCollectionProperties
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  removeRESTRootCollection(
    collHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  removeRESTChildCollection(
    parentCollHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  createRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    requestName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>>
  removeRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>>
  editRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    newRequestName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>>
  saveRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    updatedRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>>
}
