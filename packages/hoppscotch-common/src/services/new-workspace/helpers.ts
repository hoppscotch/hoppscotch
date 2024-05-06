import { Ref } from "vue"
import { HandleRef } from "./handle"
import { Workspace, WorkspaceCollection, WorkspaceRequest } from "./workspace"

export const isValidWorkspaceHandle = (
  workspaceHandle: HandleRef<Workspace>,
  providerID: string,
  workspaceID: string
): workspaceHandle is Ref<{
  data: Workspace
  type: "ok"
}> => {
  return (
    workspaceHandle.value.type === "ok" &&
    workspaceHandle.value.data.providerID === providerID &&
    workspaceHandle.value.data.workspaceID === workspaceID
  )
}

export const isValidCollectionHandle = (
  collectionHandle: HandleRef<WorkspaceCollection>,
  providerID: string,
  workspaceID: string
): collectionHandle is Ref<{
  data: WorkspaceCollection
  type: "ok"
}> => {
  return (
    collectionHandle.value.type === "ok" &&
    collectionHandle.value.data.providerID === providerID &&
    collectionHandle.value.data.workspaceID === workspaceID
  )
}

export const isValidRequestHandle = (
  requestHandle: HandleRef<WorkspaceRequest>,
  providerID: string,
  workspaceID: string
): requestHandle is Ref<{
  data: WorkspaceRequest
  type: "ok"
}> => {
  return (
    requestHandle.value.type === "ok" &&
    requestHandle.value.data.providerID === providerID &&
    requestHandle.value.data.workspaceID === workspaceID
  )
}
