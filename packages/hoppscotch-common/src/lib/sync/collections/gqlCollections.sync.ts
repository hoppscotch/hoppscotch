import { createRequestSynchronizer } from "./requestCreation"
import { findRequestByIdentity } from "./requestIdentity"
import { generateUniqueRefId, HoppCollection } from "@hoppscotch/data"

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
import {
  graphqlCollectionStore,
  navigateToFolderWithIndexPath,
  removeDuplicateGraphqlCollectionOrFolder,
} from "~/newstore/collections"
import { getSettingSubject, settingsStore } from "~/newstore/settings"
import { getSyncInitFunction, StoreSyncDefinitionOf } from ".."
import { createMapper } from "../mapper"
import {
  applyDuplicatedCollectionResult,
  moveOrReorderRequests,
  ensurePathSynced,
  reconcileRequestID,
} from "./sync"
import { ReqType } from "~/helpers/backend/graphql"
import { stripClientLocalValuesForWire } from "~/helpers/clientLocalVariables"

// gqlCollectionsMapper uses the collectionPath as the local identifier
// Helper function to transform HoppCollection to backend format
const transformCollectionForBackend = (collection: HoppCollection): any => {
  const data = {
    auth: collection.auth ?? {
      authType: "inherit",
      authActive: true,
    },
    headers: collection.headers ?? [],
    variables: stripClientLocalValuesForWire(collection.variables ?? []),
    _ref_id: collection._ref_id,
  }

  return {
    name: collection.name,
    data: JSON.stringify(data),
    folders: collection.folders.map(transformCollectionForBackend),
    requests: collection.requests,
  }
}

export const syncRequest = createRequestSynchronizer(
  async (name, wire, collectionID) => {
    const result = await createGQLUserRequest(name, wire, collectionID)
    return E.isRight(result) ? result.right.createGQLUserRequest.id : undefined
  },
  editGQLUserRequest,
  (collectionID, request, id) =>
    reconcileRequestID("GQL", collectionID, request, id)
)

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
      variables: stripClientLocalValuesForWire(collection.variables ?? []),
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

      // TODO: fix type issue
      removeDuplicateGraphqlCollectionOrFolder(
        parentCollectionID,
        collectionPath
      )
    } else {
      parentCollectionID = undefined
      return
    }
  } else {
    // if parentUserCollectionID exists, create the collection as a child collection

    const data = {
      auth: collection.auth ?? {
        authType: "inherit",
        authActive: true,
      },
      headers: collection.headers ?? [],
      variables: stripClientLocalValuesForWire(collection.variables ?? []),
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
    } else {
      parentCollectionID = undefined
      return
    }
  }

  // create the requests
  if (parentCollectionID) {
    for (const request of collection.requests) {
      const res = await createGQLUserRequest(
        request.name,
        JSON.stringify(request),
        parentCollectionID
      )

      if (res && E.isRight(res)) {
        const requestId = res.right.createGQLUserRequest.id

        request.id = requestId
      }
    }
  }

  // create the folders aka child collections
  if (parentCollectionID) {
    for (const [index, folder] of collection.folders.entries()) {
      await recursivelySyncCollections(
        folder,
        `${collectionPath}/${index}`,
        parentCollectionID
      )
    }
  }
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

const ensureGQLPathSynced = (path: string | number | null) =>
  ensurePathSynced(path, graphqlCollectionStore, recursivelySyncCollections)

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

      for (const collection of entries) {
        await recursivelySyncCollections(collection, `${indexStart}`)
        indexStart++
      }
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
  async editCollection({ collection, collectionIndex }) {
    const isSynced = await ensureGQLPathSynced(collectionIndex)
    if (!isSynced) return

    const collectionID = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      [collectionIndex]
    )?.id

    const data = {
      auth: collection.auth,
      headers: collection.headers,
      variables: stripClientLocalValuesForWire(collection.variables),
      _ref_id: collection._ref_id,
    }

    if (collectionID) {
      updateUserCollection(collectionID, collection.name, JSON.stringify(data))
    }
  },
  async addFolder({ name, path }) {
    const isSynced = await ensureGQLPathSynced(path)
    if (!isSynced) return

    const parentCollection = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map((index) => parseInt(index))
    )

    if (!parentCollection) return

    const foldersLength = parentCollection.folders.length
    if (foldersLength > 0 && parentCollection.folders[foldersLength - 1].id) {
      return
    }

    const parentCollectionBackendID = parentCollection.id

    if (parentCollectionBackendID) {
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
  async editFolder({ folder, path }) {
    const isSynced = await ensureGQLPathSynced(path)
    if (!isSynced) return

    const folderBackendId = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map((index) => parseInt(index))
    )?.id

    const data = {
      auth: folder.auth,
      headers: folder.headers,
      variables: stripClientLocalValuesForWire(folder.variables),
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
      const res = await duplicateUserCollection(collectionSyncID, ReqType.Gql)

      if (E.isRight(res)) {
        applyDuplicatedCollectionResult(
          "GQL",
          collectionSyncID,
          res.right.duplicateUserCollection.exportedCollection
        )
      }
    }
  },
  async editRequest({ path, requestNew }) {
    const localFolder = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map(Number)
    )
    if (!localFolder) return

    if (
      !requestNew._ref_id ||
      (!requestNew.id &&
        localFolder.requests.some(
          (request) =>
            request !== requestNew && request._ref_id === requestNew._ref_id
        ))
    ) {
      requestNew._ref_id = generateUniqueRefId("req")
    }
    const savedRequest = JSON.parse(JSON.stringify(requestNew))
    const isSynced = await ensureGQLPathSynced(path)
    if (!isSynced) return

    const folder = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map(Number)
    )
    if (!folder?.id) return

    const request = findRequestByIdentity(folder.requests, requestNew)
    if (!request) return

    savedRequest.id = request.id
    await syncRequest(folder.id, savedRequest)
  },
  async saveRequestAs({ path, request }) {
    // Establish identity before any asynchronous work or serialization.
    request._ref_id ??= generateUniqueRefId("req")
    const isSynced = await ensureGQLPathSynced(path)
    if (!isSynced) return

    const folder = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map(Number)
    )
    if (!folder?.id) return

    const pendingRequest = findRequestByIdentity(folder.requests, request)
    if (!pendingRequest || pendingRequest.id) return

    await syncRequest(folder.id, pendingRequest)
  },
  async removeRequest({ requestID }) {
    if (requestID) {
      await deleteUserRequest(requestID)
    }
  },
  async moveRequest({ destinationPath, path, requestIndex }) {
    const collections = graphqlCollectionStore.value.state
    const sourceCollection = navigateToFolderWithIndexPath(
      collections,
      path.split("/").map((index) => parseInt(index))
    )
    const destCollection = navigateToFolderWithIndexPath(
      collections,
      destinationPath.split("/").map((index) => parseInt(index))
    )

    const wasSourceSynced = !!sourceCollection?.id
    const wasDestSynced = !!destCollection?.id

    const isSourceSynced = await ensureGQLPathSynced(path)
    const isDestSynced = await ensureGQLPathSynced(destinationPath)
    if (!isSourceSynced || !isDestSynced) return

    if (!wasSourceSynced || !wasDestSynced) return

    moveOrReorderRequests(requestIndex, path, destinationPath, undefined, "GQL")
  },
}

export const gqlCollectionsSyncer = getSyncInitFunction(
  graphqlCollectionStore,
  storeSyncDefinition,
  () => settingsStore.value.syncCollections,
  getSettingSubject("syncCollections")
)
