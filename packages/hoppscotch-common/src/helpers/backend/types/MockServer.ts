import { WorkspaceType } from "~/helpers/backend/graphql"

/**
 * Canonical MockServer type used across the frontend.
 * Shared by BackendPlatformDef, newstore/mockServers, and mutation helpers.
 */
export type MockServer = {
  id: string
  name: string
  subdomain: string
  serverUrlPathBased?: string
  serverUrlDomainBased?: string | null
  workspaceType: WorkspaceType
  workspaceID?: string | null
  delayInMs?: number
  isPublic: boolean
  isActive: boolean
  createdOn: Date | string
  updatedOn: Date | string
  creator?: {
    uid: string
  } | null
  collection?: {
    id: string
    title: string
    requests?: any[]
  } | null
  // Legacy fields for backward compatibility
  userUid?: string
  collectionID?: string
}
