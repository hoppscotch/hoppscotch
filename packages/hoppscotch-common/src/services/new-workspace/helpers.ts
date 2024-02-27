import { Ref } from "vue"
import { HandleRef } from "./handle"
import { Workspace, WorkspaceCollection, WorkspaceRequest } from "./workspace"

export const isValidWorkspaceHandle = (
  workspace: HandleRef<Workspace>,
  providerID: string,
  workspaceID: string
): workspace is Ref<{
  data: Workspace
  type: "ok"
}> => {
  return (
    workspace.value.type === "ok" &&
    workspace.value.data.providerID === providerID &&
    workspace.value.data.workspaceID === workspaceID
  )
}

export const isValidCollectionHandle = (
  collection: HandleRef<WorkspaceCollection>,
  providerID: string,
  workspaceID: string
): collection is Ref<{
  data: WorkspaceCollection
  type: "ok"
}> => {
  return (
    collection.value.type === "ok" &&
    collection.value.data.providerID === providerID &&
    collection.value.data.workspaceID === workspaceID
  )
}

export const isValidRequestHandle = (
  request: HandleRef<WorkspaceRequest>,
  providerID: string,
  workspaceID: string
): request is Ref<{
  data: WorkspaceRequest
  type: "ok"
}> => {
  return (
    request.value.type === "ok" &&
    request.value.data.providerID === providerID &&
    request.value.data.workspaceID === workspaceID
  )
}
