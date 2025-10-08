import {
  removeDuplicateRESTCollectionOrFolder,
  restCollectionStore,
} from "@hoppscotch/common/newstore/collections"

import {
  createSyncDefinition,
  type SyncDefinitionConfig,
  type CollectionAPI,
} from "@hoppscotch/common/helpers/collections"

import { StoreSyncDefinitionOf } from "../../lib/sync"
import { createMapper } from "../../lib/sync/mapper"
import {
  createRESTChildUserCollection,
  createRESTRootUserCollection,
  createRESTUserRequest,
  deleteUserCollection,
  deleteUserRequest,
  editUserRequest,
  importUserCollectionsFromJSON,
  moveUserCollection,
  moveUserRequest,
  updateUserCollection,
  updateUserCollectionOrder,
} from "./collections.api"

import { ReqType } from "../../api/generated/graphql"

// restCollectionsMapper uses the collectionPath as the local identifier
export const restCollectionsMapper = createMapper<string, string>()

// restRequestsMapper uses the collectionPath/requestIndex as the local identifier
export const restRequestsMapper = createMapper<string, string>()

// Create API adapter for the shared sync definition
const restCollectionAPI: CollectionAPI = {
  createRESTRootUserCollection,
  createRESTChildUserCollection,
  createRESTUserRequest,
  deleteUserCollection,
  deleteUserRequest,
  editUserRequest,
  updateUserCollection,
  moveUserCollection,
  moveUserRequest,
  updateUserCollectionOrder,
  importUserCollectionsFromJSON,
}

// Create a compatible remove duplicate function
const removeDuplicateFunction = (id: string, path: string, type?: string) => {
  removeDuplicateRESTCollectionOrFolder(
    id,
    path,
    type as "collection" | "request" | undefined
  )
}

// Create sync configuration
const syncConfig: SyncDefinitionConfig = {
  api: restCollectionAPI,
  collectionStore: restCollectionStore,
  reqType: ReqType.Rest,
  removeDuplicateFunction,
}

// TODO: generalize this
// TODO: ask backend to send enough info on the subscription to not need this
export const collectionReorderOrMovingOperations: {
  sourceCollectionID: string
  destinationCollectionID?: string
  reorderOperation: {
    fromPath: string
    toPath?: string
  }
}[] = []

type OperationStatus = "pending" | "completed"

type OperationCollectionRemoved = {
  type: "COLLECTION_REMOVED"
  collectionBackendID: string
  status: OperationStatus
}

export const restCollectionsOperations: Array<OperationCollectionRemoved> = []

// Use the shared sync definition factory - this eliminates ~80% of the duplicated code!
export const storeSyncDefinition: StoreSyncDefinitionOf<
  typeof restCollectionStore
> = createSyncDefinition(syncConfig) as any
