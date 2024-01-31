import { Component } from "vue"

export type Workspace = {
  providerID: string
  workspaceID: string

  name: string

  collectionsAreReadonly: boolean
}

export type WorkspaceCollection = {
  providerID: string
  workspaceID: string
  collectionID: string

  name: string
}

export type WorkspaceDecor = {
  headerComponent?: Component

  headerCurrentIcon?: Component | object

  workspaceSelectorComponent?: Component
  workspaceSelectorPriority?: number
}
