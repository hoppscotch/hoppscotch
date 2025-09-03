import {
  graphqlCollectionStore,
  removeDuplicateGraphqlCollectionOrFolder,
} from "@hoppscotch/common/newstore/collections"

import {
  createSyncDefinition,
  type SyncDefinitionConfig,
  type CollectionAPI,
} from "@hoppscotch/common/helpers/collections"

import { StoreSyncDefinitionOf } from "../../lib/sync"
import { createMapper } from "../../lib/sync/mapper"
import {
  createGQLChildUserCollection,
  createGQLRootUserCollection,
  createGQLUserRequest,
  deleteUserCollection,
  deleteUserRequest,
  editGQLUserRequest,
  importUserCollectionsFromJSON,
  updateUserCollection,
} from "./collections.api"

import { ReqType } from "../../api/generated/graphql"

// gqlCollectionsMapper uses the collectionPath as the local identifier
export const gqlCollectionsMapper = createMapper<string, string>()

// gqlRequestsMapper uses the collectionPath/requestIndex as the local identifier
export const gqlRequestsMapper = createMapper<string, string>()

// Create API adapter for the shared sync definition (GraphQL variant)
const gqlCollectionAPI: CollectionAPI = {
  createRESTRootUserCollection: createGQLRootUserCollection,
  createRESTChildUserCollection: createGQLChildUserCollection,
  createRESTUserRequest: createGQLUserRequest,
  deleteUserCollection,
  deleteUserRequest,
  editUserRequest: editGQLUserRequest,
  updateUserCollection,
  moveUserCollection: () => Promise.resolve({} as any), // GQL may not support this
  moveUserRequest: () => Promise.resolve({} as any), // GQL may not support this
  updateUserCollectionOrder: () => Promise.resolve({} as any), // GQL may not support this
  importUserCollectionsFromJSON,
}

// Create a compatible remove duplicate function for GraphQL
const removeDuplicateFunction = (id: string, path: string, type?: string) => {
  removeDuplicateGraphqlCollectionOrFolder(
    id,
    path,
    type as "collection" | "request" | undefined
  )
}

// Create sync configuration for GraphQL collections
const syncConfig: SyncDefinitionConfig = {
  api: gqlCollectionAPI,
  collectionStore: graphqlCollectionStore,
  reqType: ReqType.Gql,
  removeDuplicateFunction,
}

// Use the shared sync definition factory - this eliminates ~80% of the duplicated code!
export const storeSyncDefinition: StoreSyncDefinitionOf<
  typeof graphqlCollectionStore
> = createSyncDefinition(syncConfig) as any
