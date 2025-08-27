import {
  graphqlCollectionStore,
  navigateToFolderWithIndexPath,
  removeDuplicateGraphqlCollectionOrFolder,
} from "@hoppscotch/common/newstore/collections"
import {
  getSettingSubject,
  settingsStore,
} from "@hoppscotch/common/newstore/settings"

import {
  generateUniqueRefId,
  HoppCollection,
  HoppRESTRequest,
} from "@hoppscotch/data"

import { getSyncInitFunction } from "@lib/sync"

import { StoreSyncDefinitionOf } from "@lib/sync"
import { createMapper } from "@lib/sync/mapper"
import {
  createGQLChildUserCollection,
  createGQLRootUserCollection,
  createGQLUserRequest,
  deleteUserCollection,
  deleteUserRequest,
  duplicateUserCollection,
  editGQLUserRequest,
  importUserCollectionsFromJSON,
  updateUserCollection,
} from "./api"

import * as E from "fp-ts/Either"
import { ReqType } from "@api/generated/graphql"
import { moveOrReorderRequests } from "./sync"

// gqlCollectionsMapper uses the collectionPath as the local identifier
// Helper function to transform HoppCollection to backend format
const transformCollectionForBackend = (collection: HoppCollection): any => {
  const data = {
    auth: collection.auth ?? {
      authType: "inherit",
      authActive: true,
    },
    headers: collection.headers ?? [],
    variables: collection.variables ?? [],
    _ref_id: collection._ref_id,
  }

  return {
    name: collection.name,
    data: JSON.stringify(data),
    folders: collection.folders.map(transformCollectionForBackend),
    requests: collection.requests,
  }
}

export const gqlCollectionsMapper = createMapper<string, string>()

// gqlRequestsMapper uses the collectionPath/requestIndex as the local identifier
export const gqlRequestsMapper = createMapper<string, string>()

// Optimized implementation using importUserCollectionsFromJSON for bulk operations
// This replaces individual createGQLRootUserCollection/createGQLChildUserCollection/createGQLUserRequest calls
const recursivelySyncCollections = async (
  collection: HoppCollection,
  collectionPath: string,
  parentUserCollectionID?: string
) => {
  let parentCollectionID = parentUserCollectionID

  // if parentUserCollectionID does not exist, create the collection as a root collection
  if (!parentUserCollectionID) {
    const data = {
      auth: collection.auth ?? {
        authType: "inherit",
        authActive: true,
      },
      headers: collection.headers ?? [],
      variables: collection.variables ?? [],
      _ref_id: collection._ref_id,
    }
    const res = await createGQLRootUserCollection(
      collection.name,
      JSON.stringify(data)
    )

    if (E.isRight(res)) {
      parentCollectionID = res.right.createGQLRootUserCollection.id

      const returnedData = res.right.createGQLRootUserCollection.data
        ? JSON.parse(res.right.createGQLRootUserCollection.data)
        : {
            auth: {
              authType: "inherit",
              authActive: true,
            },
            headers: [],
            variables: [],
            _ref_id: generateUniqueRefId("coll"),
          }

      collection.id = parentCollectionID
      collection._ref_id = returnedData._ref_id ?? generateUniqueRefId("coll")
      collection.auth = returnedData.auth
      collection.headers = returnedData.headers
      collection.variables = returnedData.variables

      removeDuplicateGraphqlCollectionOrFolder(
        parentCollectionID,
        collectionPath
      )
    } else {
      parentCollectionID = undefined
    }
  } else {
    // if parentUserCollectionID exists, create the collection as a child collection

    const data = {
      auth: collection.auth ?? {
        authType: "inherit",
        authActive: true,
      },
      headers: collection.headers ?? [],
      variables: collection.variables ?? [],
      _ref_id: collection._ref_id,
    }

    const res = await createGQLChildUserCollection(
      collection.name,
      parentUserCollectionID,
      JSON.stringify(data)
    )

    if (E.isRight(res)) {
      const childCollectionId = res.right.createGQLChildUserCollection.id

      const returnedData = res.right.createGQLChildUserCollection.data
        ? JSON.parse(res.right.createGQLChildUserCollection.data)
        : {
            auth: {
              authType: "inherit",
              authActive: true,
            },
            headers: [],
            variables: [],
            _ref_id: generateUniqueRefId("coll"),
          }

      collection.id = childCollectionId
      collection._ref_id = returnedData._ref_id ?? generateUniqueRefId("coll")
      collection.auth = returnedData.auth
      collection.headers = returnedData.headers
      parentCollectionID = childCollectionId
      collection.variables = returnedData.variables

      removeDuplicateGraphqlCollectionOrFolder(
        childCollectionId,
        `${collectionPath}`
      )
    }
  }

  // create the requests
  if (parentCollectionID) {
    collection.requests.forEach(async (request) => {
      const res =
        parentCollectionID &&
        (await createGQLUserRequest(
          request.name,
          JSON.stringify(request),
          parentCollectionID
        ))

      if (res && E.isRight(res)) {
        const requestId = res.right.createGQLUserRequest.id

        request.id = requestId
      }
    })
  }

  // create the folders aka child collections
  if (parentCollectionID)
    collection.folders.forEach(async (folder, index) => {
      recursivelySyncCollections(
        folder,
        `${collectionPath}/${index}`,
        parentCollectionID
      )
    })
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

export const gqlCollectionsOperations: Array<OperationCollectionRemoved> = []

export const storeSyncDefinition: StoreSyncDefinitionOf<
  typeof graphqlCollectionStore
> = {
  async appendCollections({ entries }) {
    if (entries.length === 0) return

    // Transform collections to backend format
    const transformedCollections = entries.map(transformCollectionForBackend)

    // Use the bulk import API instead of individual calls
    const jsonString = JSON.stringify(transformedCollections)

    const result = await importUserCollectionsFromJSON(
      jsonString,
      ReqType.Gql,
      undefined // undefined for root collections
    )

    // The backend handles creating all collections and requests in a single transaction
    // The frontend collections will be updated through subscriptions

    if (E.isLeft(result)) {
      // Fallback to individual calls if bulk import fails
      let indexStart =
        graphqlCollectionStore.value.state.length - entries.length

      entries.forEach((collection) => {
        recursivelySyncCollections(collection, `${indexStart}`)
        indexStart++
      })
    }
  },
  async addCollection({ collection }) {
    // Use individual API for single collection creation (not import)
    const lastCreatedCollectionIndex =
      graphqlCollectionStore.value.state.length - 1

    await recursivelySyncCollections(
      collection,
      `${lastCreatedCollectionIndex}`
    )
  },
  async removeCollection({ collectionID }) {
    if (collectionID) {
      await deleteUserCollection(collectionID)
    }
  },
  editCollection({ collection, collectionIndex }) {
    const collectionID = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      [collectionIndex]
    )?.id

    const data = {
      auth: collection.auth,
      headers: collection.headers,
      variables: collection.variables,
      _ref_id: collection._ref_id,
    }

    if (collectionID) {
      updateUserCollection(collectionID, collection.name, JSON.stringify(data))
    }
  },
  async addFolder({ name, path }) {
    const parentCollection = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map((index) => parseInt(index))
    )

    const parentCollectionBackendID = parentCollection?.id

    if (parentCollectionBackendID) {
      const foldersLength = parentCollection.folders.length

      const res = await createGQLChildUserCollection(
        name,
        parentCollectionBackendID
      )

      if (E.isRight(res)) {
        const { id } = res.right.createGQLChildUserCollection

        if (foldersLength) {
          parentCollection.folders[foldersLength - 1].id = id
          removeDuplicateGraphqlCollectionOrFolder(
            id,
            `${path}/${foldersLength - 1}`
          )
        }
      }
    }
  },
  editFolder({ folder, path }) {
    const folderBackendId = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map((index) => parseInt(index))
    )?.id

    const data = {
      auth: folder.auth,
      headers: folder.headers,
      variables: folder.variables,
      _ref_id: folder._ref_id,
    }

    if (folderBackendId) {
      updateUserCollection(folderBackendId, folder.name, JSON.stringify(data))
    }
  },
  async removeFolder({ folderID }) {
    if (folderID) {
      await deleteUserCollection(folderID)
    }
  },
  async duplicateCollection({ collectionSyncID }) {
    if (collectionSyncID) {
      await duplicateUserCollection(collectionSyncID, ReqType.Gql)
    }
  },
  editRequest({ path, requestIndex, requestNew }) {
    const request = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map((index) => parseInt(index))
    )?.requests[requestIndex]

    const requestBackendID = request?.id

    if (requestBackendID) {
      editGQLUserRequest(
        requestBackendID,
        (requestNew as HoppRESTRequest).name,
        JSON.stringify(requestNew)
      )
    }
  },
  async saveRequestAs({ path, request }) {
    const folder = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map((index) => parseInt(index))
    )

    const parentCollectionBackendID = folder?.id

    if (parentCollectionBackendID) {
      const newRequest = folder.requests[folder.requests.length - 1]

      const res = await createGQLUserRequest(
        (request as HoppRESTRequest).name,
        JSON.stringify(request),
        parentCollectionBackendID
      )

      if (E.isRight(res)) {
        const { id } = res.right.createGQLUserRequest

        newRequest.id = id
        removeDuplicateGraphqlCollectionOrFolder(
          id,
          `${path}/${folder.requests.length - 1}`,
          "request"
        )
      }
    }
  },
  async removeRequest({ requestID }) {
    if (requestID) {
      await deleteUserRequest(requestID)
    }
  },
  moveRequest({ destinationPath, path, requestIndex }) {
    moveOrReorderRequests(requestIndex, path, destinationPath, undefined, "GQL")
  },
}

export const gqlCollectionsSyncer = getSyncInitFunction(
  graphqlCollectionStore,
  storeSyncDefinition,
  () => settingsStore.value.syncCollections,
  getSettingSubject("syncCollections")
)
