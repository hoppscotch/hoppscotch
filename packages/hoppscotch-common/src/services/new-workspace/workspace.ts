import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
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

  collection: HoppCollection | null
}

export type WorkspaceRequest = {
  providerID: string
  workspaceID: string
  collectionID: string
  requestID: string

  request: HoppRESTRequest | null
}

export type WorkspaceDecor = {
  headerComponent?: Component

  headerCurrentIcon?: Component | object

  workspaceSelectorComponent?: Component
  workspaceSelectorPriority?: number
}
