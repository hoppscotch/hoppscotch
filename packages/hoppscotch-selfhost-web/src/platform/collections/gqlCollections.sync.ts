import {
  graphqlCollectionStore,
  navigateToFolderWithIndexPath,
  removeGraphqlRequest,
} from "@hoppscotch/common/newstore/collections"
import {
  getSettingSubject,
  settingsStore,
} from "@hoppscotch/common/newstore/settings"

import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"

import { getSyncInitFunction, runDispatchWithOutSyncing } from "../../lib/sync"

import { StoreSyncDefinitionOf } from "../../lib/sync"
import { createMapper } from "../../lib/sync/mapper"
import {
  createGQLChildUserCollection,
  createGQLRootUserCollection,
  createGQLUserRequest,
  deleteUserCollection,
  deleteUserRequest,
  editGQLUserRequest,
  moveUserRequest,
  renameUserCollection,
} from "./collections.api"

import * as E from "fp-ts/Either"
import {
  moveRequestInMapper,
  removeAndReorderEntries,
  reorderIndexesAfterEntryRemoval,
  reorderRequestsMapper,
} from "./collections.mapper"
import { removeDuplicateCollectionsFromStore } from "./collections.sync"

// gqlCollectionsMapper uses the collectionPath as the local identifier
export const gqlCollectionsMapper = createMapper<string, string>()

// gqlRequestsMapper uses the collectionPath/requestIndex as the local identifier
export const gqlRequestsMapper = createMapper<string, string>()

// temp implementation untill the backend implements an endpoint that accepts an entire collection
// TODO: use importCollectionsJSON to do this
const recursivelySyncCollections = async (
  collection: HoppCollection<HoppRESTRequest>,
  collectionPath: string,
  parentUserCollectionID?: string
) => {
  let parentCollectionID = parentUserCollectionID

  // if parentUserCollectionID does not exist, create the collection as a root collection
  if (!parentUserCollectionID) {
    const res = await createGQLRootUserCollection(collection.name)

    if (E.isRight(res)) {
      parentCollectionID = res.right.createGQLRootUserCollection.id
      gqlCollectionsMapper.addEntry(collectionPath, parentCollectionID)
    } else {
      parentCollectionID = undefined
    }
  } else {
    // if parentUserCollectionID exists, create the collection as a child collection
    const res = await createGQLChildUserCollection(
      collection.name,
      parentUserCollectionID
    )

    if (E.isRight(res)) {
      const childCollectionId = res.right.createGQLChildUserCollection.id
      gqlCollectionsMapper.addEntry(collectionPath, childCollectionId)
    }
  }

  // create the requests
  if (parentCollectionID) {
    collection.requests.forEach(async (request, index) => {
      const res =
        parentCollectionID &&
        (await createGQLUserRequest(
          request.name,
          JSON.stringify(request),
          parentCollectionID
        ))

      if (res && E.isRight(res)) {
        const requestId = res.right.createGQLUserRequest.id
        gqlRequestsMapper.addEntry(`${collectionPath}/${index}`, requestId)
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
  appendCollections({ entries }) {
    let indexStart = graphqlCollectionStore.value.state.length - entries.length

    entries.forEach((collection) => {
      recursivelySyncCollections(collection, `${indexStart}`)
      indexStart++
    })
  },
  async addCollection({ collection }) {
    const lastCreatedCollectionIndex =
      graphqlCollectionStore.value.state.length - 1

    await recursivelySyncCollections(
      collection,
      `${lastCreatedCollectionIndex}`
    )

    removeDuplicateCollectionsFromStore("GQL")
  },
  async removeCollection({ collectionIndex }) {
    const backendIdentifier = gqlCollectionsMapper.getBackendIDByLocalID(
      `${collectionIndex}`
    )

    if (backendIdentifier) {
      gqlCollectionsOperations.push({
        collectionBackendID: backendIdentifier,
        type: "COLLECTION_REMOVED",
        status: "pending",
      })
      await deleteUserCollection(backendIdentifier)
      removeAndReorderEntries(`${collectionIndex}`, "GQL")
    }
  },
  editCollection({ collection, collectionIndex }) {
    const backendIdentifier = gqlCollectionsMapper.getBackendIDByLocalID(
      `${collectionIndex}`
    )

    if (backendIdentifier && collection.name) {
      renameUserCollection(backendIdentifier, collection.name)
    }
  },
  async addFolder({ name, path }) {
    const parentCollectionBackendID =
      gqlCollectionsMapper.getBackendIDByLocalID(path)

    if (parentCollectionBackendID) {
      // TODO: remove this replaceAll thing when updating the mapper
      const res = await createGQLChildUserCollection(
        name,
        parentCollectionBackendID
      )

      // after the folder is created add the path of the folder with its backend id to the mapper
      if (E.isRight(res)) {
        const folderBackendID = res.right.createGQLChildUserCollection.id
        const parentCollection = navigateToFolderWithIndexPath(
          graphqlCollectionStore.value.state,
          path.split("/").map((index) => parseInt(index))
        )

        if (parentCollection && parentCollection.folders.length > 0) {
          const folderIndex = parentCollection.folders.length - 1
          gqlCollectionsMapper.addEntry(
            `${path}/${folderIndex}`,
            folderBackendID
          )
        }
      }
    }
  },
  editFolder({ folder, path }) {
    const folderBackendId = gqlCollectionsMapper.getBackendIDByLocalID(
      `${path}`
    )

    if (folderBackendId) {
      renameUserCollection(folderBackendId, folder.name)
    }
  },
  async removeFolder({ path }) {
    const folderBackendId = gqlCollectionsMapper.getBackendIDByLocalID(
      `${path}`
    )

    if (folderBackendId) {
      await deleteUserCollection(folderBackendId)
      removeAndReorderEntries(path, "GQL")
    }
  },
  editRequest({ path, requestIndex, requestNew }) {
    const requestPath = `${path}/${requestIndex}`

    const requestBackendID =
      gqlRequestsMapper.getBackendIDByLocalID(requestPath)

    if (requestBackendID) {
      editGQLUserRequest(
        requestBackendID,
        (requestNew as HoppRESTRequest).name,
        JSON.stringify(requestNew)
      )
    }
  },
  async saveRequestAs({ path, request }) {
    const parentCollectionBackendID =
      gqlCollectionsMapper.getBackendIDByLocalID(path)

    if (parentCollectionBackendID) {
      const res = await createGQLUserRequest(
        (request as HoppRESTRequest).name,
        JSON.stringify(request),
        parentCollectionBackendID
      )

      const existingPath =
        E.isRight(res) &&
        gqlRequestsMapper.getLocalIDByBackendID(
          res.right.createGQLUserRequest.id
        )

      // remove the request if it is already existing ( can happen when the subscription fired before the mutation is resolved )
      if (existingPath) {
        const indexes = existingPath.split("/")
        const existingRequestIndex = indexes.pop()
        const existingRequestParentPath = indexes.join("/")

        runDispatchWithOutSyncing(() => {
          existingRequestIndex &&
            removeGraphqlRequest(
              existingRequestParentPath,
              parseInt(existingRequestIndex)
            )
        })
      }

      const parentCollection = navigateToFolderWithIndexPath(
        graphqlCollectionStore.value.state,
        path.split("/").map((index) => parseInt(index))
      )

      if (parentCollection) {
        const lastCreatedRequestIndex = parentCollection.requests.length - 1

        if (E.isRight(res)) {
          gqlRequestsMapper.addEntry(
            `${path}/${lastCreatedRequestIndex}`,
            res.right.createGQLUserRequest.id
          )
        }
      }
    }
  },
  async removeRequest({ path, requestIndex }) {
    const requestPath = `${path}/${requestIndex}`
    const requestBackendID =
      gqlRequestsMapper.getBackendIDByLocalID(requestPath)

    if (requestBackendID) {
      await deleteUserRequest(requestBackendID)
      gqlRequestsMapper.removeEntry(requestPath)
      reorderIndexesAfterEntryRemoval(path, gqlRequestsMapper, "GQL")
    }
  },
  moveRequest({ destinationPath, path, requestIndex }) {
    moveOrReorderRequests(requestIndex, path, destinationPath)
  },
}

export const gqlCollectionsSyncer = getSyncInitFunction(
  graphqlCollectionStore,
  storeSyncDefinition,
  () => settingsStore.value.syncCollections,
  getSettingSubject("syncCollections")
)

async function moveOrReorderRequests(
  requestIndex: number,
  path: string,
  destinationPath: string,
  nextRequestIndex?: number
) {
  const sourceCollectionBackendID =
    gqlCollectionsMapper.getBackendIDByLocalID(path)
  const destinationCollectionBackendID =
    gqlCollectionsMapper.getBackendIDByLocalID(destinationPath)

  const requestBackendID = gqlRequestsMapper.getBackendIDByLocalID(
    `${path}/${requestIndex}`
  )

  let nextRequestBackendID: string | undefined

  // we only need this for reordering requests, not for moving requests
  if (nextRequestIndex) {
    nextRequestBackendID = gqlRequestsMapper.getBackendIDByLocalID(
      `${destinationPath}/${nextRequestIndex}`
    )
  }

  if (
    sourceCollectionBackendID &&
    destinationCollectionBackendID &&
    requestBackendID
  ) {
    await moveUserRequest(
      sourceCollectionBackendID,
      destinationCollectionBackendID,
      requestBackendID,
      nextRequestBackendID
    )

    if (nextRequestBackendID && nextRequestIndex) {
      reorderRequestsMapper(requestIndex, path, nextRequestIndex, "GQL")
    } else {
      moveRequestInMapper(requestIndex, path, destinationPath, "GQL")
    }
  }
}
