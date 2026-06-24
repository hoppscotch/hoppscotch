import {
  generateUniqueRefId,
  HoppCollection,
  HoppRESTRequest,
} from "@hoppscotch/data"

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
import { applyDuplicatedCollectionResult, moveOrReorderRequests } from "./sync"
import { ReqType } from "~/helpers/backend/graphql"
import { stripSecretVariableValuesForWire } from "~/helpers/secretVariables"

// gqlCollectionsMapper uses the collectionPath as the local identifier
// Helper function to transform HoppCollection to backend format
const transformCollectionForBackend = (collection: HoppCollection): any => {
  const data = {
    auth: collection.auth ?? {
      authType: "inherit",
      authActive: true,
    },
    headers: collection.headers ?? [],
    variables: stripSecretVariableValuesForWire(collection.variables ?? []),
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
      variables: stripSecretVariableValuesForWire(collection.variables ?? []),
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
    }
  } else {
    // if parentUserCollectionID exists, create the collection as a child collection

    const data = {
      auth: collection.auth ?? {
        authType: "inherit",
        authActive: true,
      },
      headers: collection.headers ?? [],
      variables: stripSecretVariableValuesForWire(collection.variables ?? []),
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
  editCollection({ collection, collectionIndex }) {
    // Send the backend id when present, otherwise the index path — GraphQL
    // collections on some platforms (e.g. hoppscotch-web) carry no backend id.
    const collectionID =
      navigateToFolderWithIndexPath(graphqlCollectionStore.value.state, [
        collectionIndex,
      ])?.id ?? `${collectionIndex}`

    const data = {
      auth: collection.auth,
      headers: collection.headers,
      variables: stripSecretVariableValuesForWire(collection.variables),
      _ref_id: collection._ref_id,
    }

    updateUserCollection(collectionID, collection.name, JSON.stringify(data))
  },
  async addFolder({ name, path }) {
    const parentCollection = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map((index) => parseInt(index))
    )

    if (!parentCollection) return

    // Send the parent backend id when present, otherwise its index path.
    const parentCollectionBackendID = parentCollection.id ?? path

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
  },
  editFolder({ folder, path }) {
    // Send the backend id when present, otherwise the index path.
    const folderBackendId =
      navigateToFolderWithIndexPath(
        graphqlCollectionStore.value.state,
        path.split("/").map((index) => parseInt(index))
      )?.id ?? path

    const data = {
      auth: folder.auth,
      headers: folder.headers,
      variables: stripSecretVariableValuesForWire(folder.variables),
      _ref_id: folder._ref_id,
    }

    updateUserCollection(folderBackendId, folder.name, JSON.stringify(data))
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
  editRequest({ path, requestIndex, requestNew }) {
    const request = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map((index) => parseInt(index))
    )?.requests[requestIndex]

    // Send the backend id when present, otherwise the index path.
    const requestBackendID = request?.id ?? `${path}/${requestIndex}`

    editGQLUserRequest(
      requestBackendID,
      (requestNew as HoppRESTRequest).name,
      JSON.stringify(requestNew)
    )
  },
  async saveRequestAs({ path, request }) {
    const folder = navigateToFolderWithIndexPath(
      graphqlCollectionStore.value.state,
      path.split("/").map((index) => parseInt(index))
    )

    if (!folder) return

    // Send the parent backend id when present, otherwise its index path.
    const parentCollectionBackendID = folder.id ?? path

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
