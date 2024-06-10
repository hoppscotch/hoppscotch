import { HoppRESTRequest } from "@hoppscotch/data"
import { Component } from "vue"

export type Workspace = {
  providerID: string
  workspaceID: string

  name: string
}

export type WorkspaceCollection = {
  providerID: string
  workspaceID: string
  collectionID: string

  name: string
}

export type WorkspaceRequest = {
  providerID: string
  workspaceID: string
  collectionID: string
  requestID: string

  request: HoppRESTRequest
}

export type WorkspaceDecor = {
  headerComponent?: Component

  headerCurrentIcon?: Component | object

  workspaceSelectorComponent?: Component
  workspaceSelectorPriority?: number
}
