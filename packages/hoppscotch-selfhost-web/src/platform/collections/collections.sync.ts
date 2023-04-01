import {
  navigateToFolderWithIndexPath,
  removeGraphqlCollection,
  removeRESTCollection,
  removeRESTRequest,
  restCollectionStore,
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
  createRESTChildUserCollection,
  createRESTRootUserCollection,
  createRESTUserRequest,
  deleteUserCollection,
  deleteUserRequest,
  editUserRequest,
  moveUserCollection,
  moveUserRequest,
  renameUserCollection,
  updateUserCollectionOrder,
} from "./collections.api"

import * as E from "fp-ts/Either"
import {
  removeAndReorderEntries,
  moveCollectionInMapper,
  reorderIndexesAfterEntryRemoval,
  reorderCollectionsInMapper,
  reorderRequestsMapper,
  moveRequestInMapper,
} from "./collections.mapper"
import { gqlCollectionsMapper } from "./gqlCollections.sync"

// restCollectionsMapper uses the collectionPath as the local identifier
export const restCollectionsMapper = createMapper<string, string>()

// restRequestsMapper uses the collectionPath/requestIndex as the local identifier
export const restRequestsMapper = createMapper<string, string>()

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
    const res = await createRESTRootUserCollection(collection.name)

    if (E.isRight(res)) {
      parentCollectionID = res.right.createRESTRootUserCollection.id
      restCollectionsMapper.addEntry(collectionPath, parentCollectionID)
    } else {
      parentCollectionID = undefined
    }
  } else {
    // if parentUserCollectionID exists, create the collection as a child collection
    const res = await createRESTChildUserCollection(
      collection.name,
      parentUserCollectionID
    )

    if (E.isRight(res)) {
      const childCollectionId = res.right.createRESTChildUserCollection.id
      restCollectionsMapper.addEntry(collectionPath, childCollectionId)
    }
  }

  // create the requests
  if (parentCollectionID) {
    collection.requests.forEach(async (request, index) => {
      const res =
        parentCollectionID &&
        (await createRESTUserRequest(
          request.name,
          JSON.stringify(request),
          parentCollectionID
        ))

      if (res && E.isRight(res)) {
        const requestId = res.right.createRESTUserRequest.id
        restRequestsMapper.addEntry(`${collectionPath}/${index}`, requestId)
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

export const restCollectionsOperations: Array<OperationCollectionRemoved> = []

export const storeSyncDefinition: StoreSyncDefinitionOf<
  typeof restCollectionStore
> = {
  appendCollections({ entries }) {
    let indexStart = restCollectionStore.value.state.length - entries.length

    entries.forEach((collection) => {
      recursivelySyncCollections(collection, `${indexStart}`)
      indexStart++
    })
  },
  async addCollection({ collection }) {
    const lastCreatedCollectionIndex =
      restCollectionStore.value.state.length - 1

    await recursivelySyncCollections(
      collection,
      `${lastCreatedCollectionIndex}`
    )

    removeDuplicateCollectionsFromStore("REST")
  },
  async removeCollection({ collectionIndex }) {
    const backendIdentifier = restCollectionsMapper.getBackendIDByLocalID(
      `${collectionIndex}`
    )

    if (backendIdentifier) {
      restCollectionsOperations.push({
        collectionBackendID: backendIdentifier,
        type: "COLLECTION_REMOVED",
        status: "pending",
      })
      await deleteUserCollection(backendIdentifier)
      removeAndReorderEntries(`${collectionIndex}`, "REST")
    }
  },
  editCollection({ partialCollection: collection, collectionIndex }) {
    const backendIdentifier = restCollectionsMapper.getBackendIDByLocalID(
      `${collectionIndex}`
    )

    if (backendIdentifier && collection.name) {
      renameUserCollection(backendIdentifier, collection.name)
    }
  },
  async addFolder({ name, path }) {
    const parentCollectionBackendID =
      restCollectionsMapper.getBackendIDByLocalID(path)

    if (parentCollectionBackendID) {
      // TODO: remove this replaceAll thing when updating the mapper
      const res = await createRESTChildUserCollection(
        name,
        parentCollectionBackendID
      )

      // after the folder is created add the path of the folder with its backend id to the mapper
      if (E.isRight(res)) {
        const folderBackendID = res.right.createRESTChildUserCollection.id
        const parentCollection = navigateToFolderWithIndexPath(
          restCollectionStore.value.state,
          path.split("/").map((index) => parseInt(index))
        )

        if (parentCollection && parentCollection.folders.length > 0) {
          const folderIndex = parentCollection.folders.length - 1
          restCollectionsMapper.addEntry(
            `${path}/${folderIndex}`,
            folderBackendID
          )
        }
      }
    }
  },
  editFolder({ folder, path }) {
    const folderBackendId = restCollectionsMapper.getBackendIDByLocalID(
      `${path}`
    )

    const folderName = folder.name

    if (folderBackendId && folderName) {
      renameUserCollection(folderBackendId, folderName)
    }
  },
  async removeFolder({ path }) {
    const folderBackendId = restCollectionsMapper.getBackendIDByLocalID(
      `${path}`
    )

    if (folderBackendId) {
      await deleteUserCollection(folderBackendId)
      removeAndReorderEntries(path, "REST")
    }
  },
  async moveFolder({ destinationPath, path }) {
    const sourceCollectionBackendID =
      restCollectionsMapper.getBackendIDByLocalID(path)

    const destinationCollectionBackendID = destinationPath
      ? restCollectionsMapper.getBackendIDByLocalID(destinationPath)
      : undefined

    if (sourceCollectionBackendID) {
      await moveUserCollection(
        sourceCollectionBackendID,
        destinationCollectionBackendID
      )

      moveCollectionInMapper(path, destinationPath ?? undefined, "REST")
    }
  },
  editRequest({ path, requestIndex, requestNew }) {
    const requestPath = `${path}/${requestIndex}`

    const requestBackendID =
      restRequestsMapper.getBackendIDByLocalID(requestPath)

    if (requestBackendID) {
      editUserRequest(
        requestBackendID,
        (requestNew as HoppRESTRequest).name,
        JSON.stringify(requestNew)
      )
    }
  },
  async saveRequestAs({ path, request }) {
    const parentCollectionBackendID =
      restCollectionsMapper.getBackendIDByLocalID(path)

    if (parentCollectionBackendID) {
      const res = await createRESTUserRequest(
        (request as HoppRESTRequest).name,
        JSON.stringify(request),
        parentCollectionBackendID
      )

      const existingPath =
        E.isRight(res) &&
        restRequestsMapper.getLocalIDByBackendID(
          res.right.createRESTUserRequest.id
        )

      // remove the request if it is already existing ( can happen when the subscription fired before the mutation is resolved )
      if (existingPath) {
        const indexes = existingPath.split("/")
        const existingRequestIndex = indexes.pop()
        const existingRequestParentPath = indexes.join("/")

        runDispatchWithOutSyncing(() => {
          existingRequestIndex &&
            removeRESTRequest(
              existingRequestParentPath,
              parseInt(existingRequestIndex)
            )
        })
      }

      const parentCollection = navigateToFolderWithIndexPath(
        restCollectionStore.value.state,
        path.split("/").map((index) => parseInt(index))
      )

      if (parentCollection) {
        const lastCreatedRequestIndex = parentCollection.requests.length - 1

        if (E.isRight(res)) {
          restRequestsMapper.addEntry(
            `${path}/${lastCreatedRequestIndex}`,
            res.right.createRESTUserRequest.id
          )
        }
      }
    }
  },
  async removeRequest({ path, requestIndex }) {
    const requestPath = `${path}/${requestIndex}`
    const requestBackendID =
      restRequestsMapper.getBackendIDByLocalID(requestPath)

    if (requestBackendID) {
      await deleteUserRequest(requestBackendID)
      restRequestsMapper.removeEntry(requestPath)
      reorderIndexesAfterEntryRemoval(path, restRequestsMapper, "REST")
    }
  },
  moveRequest({ destinationPath, path, requestIndex }) {
    moveOrReorderRequests(requestIndex, path, destinationPath)
  },
  updateRequestOrder({
    destinationCollectionPath,
    destinationRequestIndex,
    requestIndex,
  }) {
    /**
     * currently the FE implementation only supports reordering requests between the same collection,
     * so destinationCollectionPath and sourceCollectionPath will be same
     */
    moveOrReorderRequests(
      requestIndex,
      destinationCollectionPath,
      destinationCollectionPath,
      destinationRequestIndex
    )
  },
  async updateCollectionOrder({
    collectionIndex: collectionPath,
    destinationCollectionIndex: destinationCollectionPath,
  }) {
    const sourceBackendID =
      restCollectionsMapper.getBackendIDByLocalID(collectionPath)

    const destinationBackendID = restCollectionsMapper.getBackendIDByLocalID(
      destinationCollectionPath
    )

    if (sourceBackendID) {
      collectionReorderOrMovingOperations.push({
        sourceCollectionID: sourceBackendID,
        destinationCollectionID: destinationBackendID,
        reorderOperation: {
          fromPath: `${parseInt(destinationCollectionPath) - 1}`,
          toPath: destinationCollectionPath,
        },
      })

      await updateUserCollectionOrder(sourceBackendID, destinationBackendID)

      const currentSourcePath =
        restCollectionsMapper.getLocalIDByBackendID(sourceBackendID)

      const hasAlreadyHappened = !!(
        currentSourcePath == `${parseInt(destinationCollectionPath) - 1}`
      )

      if (!hasAlreadyHappened) {
        reorderCollectionsInMapper(
          collectionPath,
          destinationCollectionPath,
          "REST"
        )
      }
    }
  },
}

export const collectionsSyncer = getSyncInitFunction(
  restCollectionStore,
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
    restCollectionsMapper.getBackendIDByLocalID(path)
  const destinationCollectionBackendID =
    restCollectionsMapper.getBackendIDByLocalID(destinationPath)

  const requestBackendID = restRequestsMapper.getBackendIDByLocalID(
    `${path}/${requestIndex}`
  )

  let nextRequestBackendID: string | undefined

  // we only need this for reordering requests, not for moving requests
  if (nextRequestIndex) {
    nextRequestBackendID = restRequestsMapper.getBackendIDByLocalID(
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
      reorderRequestsMapper(requestIndex, path, nextRequestIndex, "REST")
    } else {
      moveRequestInMapper(requestIndex, path, destinationPath, "REST")
    }
  }
}

export function removeDuplicateCollectionsFromStore(
  collectionType: "REST" | "GQL"
) {
  const collectionsMapper =
    collectionType === "REST" ? restCollectionsMapper : gqlCollectionsMapper

  const mapperEntries = Array.from(collectionsMapper.getValue().entries())

  const seenBackendIDs = new Set<string>()

  const localIDsToRemove = new Set<string>()

  mapperEntries.forEach(([localID, backendID]) => {
    if (backendID && seenBackendIDs.has(backendID)) {
      localIDsToRemove.add(localID)
    } else {
      backendID && seenBackendIDs.add(backendID)
    }
  })

  localIDsToRemove.forEach((localID) => {
    collectionType === "REST"
      ? removeRESTCollection(parseInt(localID))
      : removeGraphqlCollection(parseInt(localID))

    collectionsMapper.removeEntry(undefined, localID)

    const indexes = localID.split("/")
    indexes.pop()
    const parentPath = indexes.join("/")

    reorderIndexesAfterEntryRemoval(parentPath, collectionsMapper, "REST")
  })
}
