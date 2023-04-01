import { authEvents$, def as platformAuth } from "@platform/auth"
import { CollectionsPlatformDef } from "@hoppscotch/common/platform/collections"
import { runDispatchWithOutSyncing } from "../../lib/sync"

import {
  exportUserCollectionsToJSON,
  runUserCollectionCreatedSubscription,
  runUserCollectionMovedSubscription,
  runUserCollectionOrderUpdatedSubscription,
  runUserCollectionRemovedSubscription,
  runUserCollectionUpdatedSubscription,
  runUserRequestCreatedSubscription,
  runUserRequestDeletedSubscription,
  runUserRequestMovedSubscription,
  runUserRequestUpdatedSubscription,
} from "./collections.api"
import {
  collectionReorderOrMovingOperations,
  collectionsSyncer,
  restCollectionsOperations,
  restCollectionsMapper,
  restRequestsMapper,
} from "./collections.sync"
import {
  moveCollectionInMapper,
  removeAndReorderEntries,
  reorderIndexesAfterEntryRemoval,
  reorderCollectionsInMapper,
  getMappersAndStoreByType,
} from "./collections.mapper"

import * as E from "fp-ts/Either"
import {
  addRESTCollection,
  setRESTCollections,
  editRESTCollection,
  removeRESTCollection,
  moveRESTFolder,
  updateRESTCollectionOrder,
  saveRESTRequestAs,
  navigateToFolderWithIndexPath,
  editRESTRequest,
  removeRESTRequest,
  moveRESTRequest,
  updateRESTRequestOrder,
  addRESTFolder,
  editRESTFolder,
  removeRESTFolder,
  addGraphqlFolder,
  addGraphqlCollection,
  editGraphqlFolder,
  editGraphqlCollection,
  removeGraphqlFolder,
  removeGraphqlCollection,
  saveGraphqlRequestAs,
  editGraphqlRequest,
  moveGraphqlRequest,
  removeGraphqlRequest,
  setGraphqlCollections,
} from "@hoppscotch/common/newstore/collections"
import { runGQLSubscription } from "@hoppscotch/common/helpers/backend/GQLClient"
import {
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"
import {
  gqlCollectionsOperations,
  gqlCollectionsSyncer,
} from "./gqlCollections.sync"
import { ReqType } from "../../api/generated/graphql"

function initCollectionsSync() {
  const currentUser$ = platformAuth.getCurrentUserStream()
  collectionsSyncer.startStoreSync()
  collectionsSyncer.setupSubscriptions(setupSubscriptions)

  gqlCollectionsSyncer.startStoreSync()

  loadUserRootCollections("REST")
  loadUserRootCollections("GQL")

  // TODO: test & make sure the auth thing is working properly
  currentUser$.subscribe(async (user) => {
    if (user) {
      loadUserRootCollections("REST")
      loadUserRootCollections("GQL")
    }
  })

  authEvents$.subscribe((event) => {
    if (event.event == "login" || event.event == "token_refresh") {
      collectionsSyncer.startListeningToSubscriptions()
    }

    if (event.event == "logout") {
      collectionsSyncer.stopListeningToSubscriptions()
    }
  })
}

type ExportedUserCollectionREST = {
  id?: string
  folders: ExportedUserCollectionREST[]
  requests: Array<HoppRESTRequest & { id: string }>
  name: string
}

type ExportedUserCollectionGQL = {
  id?: string
  folders: ExportedUserCollectionGQL[]
  requests: Array<HoppGQLRequest & { id: string }>
  name: string
}

function exportedCollectionToHoppCollection(
  collection: ExportedUserCollectionREST | ExportedUserCollectionGQL,
  collectionType: "REST" | "GQL"
): HoppCollection<HoppRESTRequest | HoppGQLRequest> {
  if (collectionType == "REST") {
    const restCollection = collection as ExportedUserCollectionREST

    return {
      v: 1,
      name: restCollection.name,
      folders: restCollection.folders.map((folder) =>
        exportedCollectionToHoppCollection(folder, collectionType)
      ),
      requests: restCollection.requests.map(
        ({
          v,
          auth,
          body,
          endpoint,
          headers,
          method,
          name,
          params,
          preRequestScript,
          testScript,
        }) => ({
          v,
          auth,
          body,
          endpoint,
          headers,
          method,
          name,
          params,
          preRequestScript,
          testScript,
        })
      ),
    }
  } else {
    const gqlCollection = collection as ExportedUserCollectionGQL

    return {
      v: 1,
      name: gqlCollection.name,
      folders: gqlCollection.folders.map((folder) =>
        exportedCollectionToHoppCollection(folder, collectionType)
      ),
      requests: gqlCollection.requests.map(({ v, auth, headers, name }) => ({
        v,
        auth,
        headers,
        name,
      })) as HoppGQLRequest[],
    }
  }
}

function addMapperEntriesForExportedCollection(
  collection: ExportedUserCollectionREST | ExportedUserCollectionGQL,
  localPath: string,
  collectionType: "REST" | "GQL"
) {
  const { collectionsMapper, requestsMapper } =
    getMappersAndStoreByType(collectionType)

  if (collection.id) {
    collectionsMapper.addEntry(localPath, collection.id)

    collection.folders.forEach((folder, index) => {
      addMapperEntriesForExportedCollection(
        folder,
        `${localPath}/${index}`,
        collectionType
      )
    })

    collection.requests.forEach((request, index) => {
      const requestID = request.id

      requestID && requestsMapper.addEntry(`${localPath}/${index}`, requestID)
    })
  }
}

async function loadUserRootCollections(collectionType: "REST" | "GQL") {
  const res = await exportUserCollectionsToJSON(
    undefined,
    collectionType == "REST" ? ReqType.Rest : ReqType.Gql
  )

  if (E.isRight(res)) {
    const collectionsJSONString =
      res.right.exportUserCollectionsToJSON.exportedCollection
    const exportedCollections = (
      JSON.parse(collectionsJSONString) as Array<
        ExportedUserCollectionGQL | ExportedUserCollectionREST
      >
    ).map((collection) => ({ v: 1, ...collection }))

    runDispatchWithOutSyncing(() => {
      collectionType == "REST"
        ? setRESTCollections(
            exportedCollections.map(
              (collection) =>
                exportedCollectionToHoppCollection(
                  collection,
                  "REST"
                ) as HoppCollection<HoppRESTRequest>
            )
          )
        : setGraphqlCollections(
            exportedCollections.map(
              (collection) =>
                exportedCollectionToHoppCollection(
                  collection,
                  "GQL"
                ) as HoppCollection<HoppGQLRequest>
            )
          )

      exportedCollections.forEach((collection, index) =>
        addMapperEntriesForExportedCollection(
          collection,
          `${index}`,
          collectionType
        )
      )
    })
  }
}

function setupSubscriptions() {
  let subs: ReturnType<typeof runGQLSubscription>[1][] = []

  const userCollectionCreatedSub = setupUserCollectionCreatedSubscription()
  const userCollectionUpdatedSub = setupUserCollectionUpdatedSubscription()
  const userCollectionRemovedSub = setupUserCollectionRemovedSubscription()
  const userCollectionMovedSub = setupUserCollectionMovedSubscription()
  const userCollectionOrderUpdatedSub =
    setupUserCollectionOrderUpdatedSubscription()
  const userRequestCreatedSub = setupUserRequestCreatedSubscription()
  const userRequestUpdatedSub = setupUserRequestUpdatedSubscription()
  const userRequestDeletedSub = setupUserRequestDeletedSubscription()
  const userRequestMovedSub = setupUserRequestMovedSubscription()

  subs = [
    userCollectionCreatedSub,
    userCollectionUpdatedSub,
    userCollectionRemovedSub,
    userCollectionMovedSub,
    userCollectionOrderUpdatedSub,
    userRequestCreatedSub,
    userRequestUpdatedSub,
    userRequestDeletedSub,
    userRequestMovedSub,
  ]

  return () => {
    subs.forEach((sub) => sub.unsubscribe())
  }
}

function setupUserCollectionCreatedSubscription() {
  const [userCollectionCreated$, userCollectionCreatedSub] =
    runUserCollectionCreatedSubscription()

  userCollectionCreated$.subscribe((res) => {
    if (E.isRight(res)) {
      const collectionType = res.right.userCollectionCreated.type

      const { collectionsMapper, collectionStore } =
        getMappersAndStoreByType(collectionType)

      const userCollectionBackendID = res.right.userCollectionCreated.id
      const parentCollectionID = res.right.userCollectionCreated.parent?.id

      const userCollectionLocalID = collectionsMapper.getLocalIDByBackendID(
        userCollectionBackendID
      )

      // collection already exists in store ( this instance created it )
      if (userCollectionLocalID) {
        return
      }

      const parentCollectionPath =
        parentCollectionID &&
        collectionsMapper.getLocalIDByBackendID(parentCollectionID)

      // only folders will have parent collection id
      if (parentCollectionID && parentCollectionPath) {
        runDispatchWithOutSyncing(() => {
          collectionType == "GQL"
            ? addGraphqlFolder(
                res.right.userCollectionCreated.title,
                parentCollectionPath
              )
            : addRESTFolder(
                res.right.userCollectionCreated.title,
                parentCollectionPath
              )

          const parentCollection = navigateToFolderWithIndexPath(
            collectionStore.value.state,
            parentCollectionPath
              .split("/")
              .map((pathIndex) => parseInt(pathIndex))
          )

          if (parentCollection) {
            const folderIndex = parentCollection.folders.length - 1
            collectionsMapper.addEntry(
              `${parentCollectionPath}/${folderIndex}`,
              userCollectionBackendID
            )
          }
        })
      } else {
        // root collections won't have parentCollectionID
        runDispatchWithOutSyncing(() => {
          collectionType == "GQL"
            ? addGraphqlCollection({
                name: res.right.userCollectionCreated.title,
                folders: [],
                requests: [],
                v: 1,
              })
            : addRESTCollection({
                name: res.right.userCollectionCreated.title,
                folders: [],
                requests: [],
                v: 1,
              })

          const localIndex = collectionStore.value.state.length - 1
          collectionsMapper.addEntry(`${localIndex}`, userCollectionBackendID)
        })
      }
    }
  })

  return userCollectionCreatedSub
}

function setupUserCollectionUpdatedSubscription() {
  const [userCollectionUpdated$, userCollectionUpdatedSub] =
    runUserCollectionUpdatedSubscription()

  userCollectionUpdated$.subscribe((res) => {
    if (E.isRight(res)) {
      const collectionType = res.right.userCollectionUpdated.type

      const { collectionsMapper } = getMappersAndStoreByType(collectionType)

      const updatedCollectionBackendID = res.right.userCollectionUpdated.id
      const updatedCollectionLocalPath =
        collectionsMapper.getLocalIDByBackendID(updatedCollectionBackendID)

      const isFolder =
        updatedCollectionLocalPath &&
        updatedCollectionLocalPath.split("/").length > 1

      // updated collection is a folder
      if (isFolder) {
        runDispatchWithOutSyncing(() => {
          collectionType == "REST"
            ? editRESTFolder(updatedCollectionLocalPath, {
                name: res.right.userCollectionUpdated.title,
              })
            : editGraphqlFolder(updatedCollectionLocalPath, {
                name: res.right.userCollectionUpdated.title,
              })
        })
      }

      // updated collection is a root collection
      if (updatedCollectionLocalPath && !isFolder) {
        runDispatchWithOutSyncing(() => {
          collectionType == "REST"
            ? editRESTCollection(parseInt(updatedCollectionLocalPath), {
                name: res.right.userCollectionUpdated.title,
              })
            : editGraphqlCollection(parseInt(updatedCollectionLocalPath), {
                name: res.right.userCollectionUpdated.title,
              })
        })
      }
    }
  })

  return userCollectionUpdatedSub
}

function setupUserCollectionMovedSubscription() {
  const [userCollectionMoved$, userCollectionMovedSub] =
    runUserCollectionMovedSubscription()

  userCollectionMoved$.subscribe((res) => {
    if (E.isRight(res)) {
      const movedMetadata = res.right.userCollectionMoved

      const sourcePath = restCollectionsMapper.getLocalIDByBackendID(
        movedMetadata.id
      )

      let destinationPath: string | undefined

      if (movedMetadata.parent?.id) {
        destinationPath = restCollectionsMapper.getLocalIDByBackendID(
          movedMetadata.parent?.id
        )
      }

      const hasAlreadyHappened = hasReorderingOrMovingAlreadyHappened(
        {
          sourceCollectionID: movedMetadata.id,
          destinationCollectionID: movedMetadata.parent?.id,
          sourcePath,
          destinationPath,
        },
        "MOVING"
      )

      if (!hasAlreadyHappened) {
        sourcePath &&
          runDispatchWithOutSyncing(() => {
            moveRESTFolder(sourcePath, destinationPath ?? null)
          })

        sourcePath &&
          moveCollectionInMapper(sourcePath, destinationPath, "REST")
      }
    }
  })

  return userCollectionMovedSub
}

function setupUserCollectionRemovedSubscription() {
  const [userCollectionRemoved$, userCollectionRemovedSub] =
    runUserCollectionRemovedSubscription()

  userCollectionRemoved$.subscribe((res) => {
    if (E.isRight(res)) {
      const removedCollectionBackendID = res.right.userCollectionRemoved.id
      const collectionType = res.right.userCollectionRemoved.type

      const { collectionsMapper } = getMappersAndStoreByType(collectionType)

      const collectionsOperations =
        collectionType == "REST"
          ? restCollectionsOperations
          : gqlCollectionsOperations

      const removedCollectionLocalPath =
        collectionsMapper.getLocalIDByBackendID(removedCollectionBackendID)

      // TODO: seperate operations for rest and gql
      const isInOperations = !!collectionsOperations.find(
        (operation) =>
          operation.type == "COLLECTION_REMOVED" &&
          operation.collectionBackendID == removedCollectionBackendID
      )

      // the collection is already removed
      if (!removedCollectionLocalPath || isInOperations) {
        return
      }

      const isFolder =
        removedCollectionLocalPath &&
        removedCollectionLocalPath.split("/").length > 1

      if (removedCollectionLocalPath && isFolder) {
        runDispatchWithOutSyncing(() => {
          collectionType == "REST"
            ? removeRESTFolder(removedCollectionLocalPath)
            : removeGraphqlFolder(removedCollectionLocalPath)
        })
      }

      if (removedCollectionLocalPath && !isFolder) {
        runDispatchWithOutSyncing(() => {
          collectionType == "REST"
            ? removeRESTCollection(parseInt(removedCollectionLocalPath))
            : removeGraphqlCollection(parseInt(removedCollectionLocalPath))
        })
      }

      removedCollectionLocalPath &&
        removeAndReorderEntries(removedCollectionLocalPath, collectionType)
    }
  })

  return userCollectionRemovedSub
}

function setupUserCollectionOrderUpdatedSubscription() {
  const [userCollectionOrderUpdated$, userCollectionOrderUpdatedSub] =
    runUserCollectionOrderUpdatedSubscription()

  userCollectionOrderUpdated$.subscribe((res) => {
    if (E.isRight(res)) {
      const { userCollection, nextUserCollection } =
        res.right.userCollectionOrderUpdated

      const sourceCollectionID = userCollection.id
      const destinationCollectionID = nextUserCollection?.id

      const sourcePath =
        restCollectionsMapper.getLocalIDByBackendID(sourceCollectionID)

      let destinationPath: string | undefined

      if (destinationCollectionID) {
        destinationPath = restCollectionsMapper.getLocalIDByBackendID(
          destinationCollectionID
        )
      }

      const hasAlreadyHappened = hasReorderingOrMovingAlreadyHappened(
        {
          sourceCollectionID,
          destinationCollectionID,
          sourcePath,
          destinationPath,
        },
        "REORDERING"
      )

      if (!hasAlreadyHappened) {
        runDispatchWithOutSyncing(() => {
          if (
            sourcePath &&
            destinationPath &&
            sourceCollectionID &&
            destinationCollectionID
          ) {
            updateRESTCollectionOrder(sourcePath, destinationPath)
            reorderCollectionsInMapper(sourcePath, destinationPath, "REST")
          }
        })
      }
    }
  })

  return userCollectionOrderUpdatedSub
}

function setupUserRequestCreatedSubscription() {
  const [userRequestCreated$, userRequestCreatedSub] =
    runUserRequestCreatedSubscription()

  userRequestCreated$.subscribe((res) => {
    if (E.isRight(res)) {
      const collectionID = res.right.userRequestCreated.collectionID
      const request = JSON.parse(res.right.userRequestCreated.request)
      const requestID = res.right.userRequestCreated.id

      const requestType = res.right.userRequestCreated.type

      const { collectionsMapper, requestsMapper, collectionStore } =
        getMappersAndStoreByType(requestType)

      const hasAlreadyHappened =
        !!requestsMapper.getLocalIDByBackendID(requestID)

      if (hasAlreadyHappened) {
        return
      }

      const collectionPath =
        collectionsMapper.getLocalIDByBackendID(collectionID)

      if (collectionID && collectionPath) {
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? saveRESTRequestAs(collectionPath, request)
            : saveGraphqlRequestAs(collectionPath, request)

          const target = navigateToFolderWithIndexPath(
            collectionStore.value.state,
            collectionPath.split("/").map((index) => parseInt(index))
          )

          const requestPath =
            target && `${collectionPath}/${target?.requests.length - 1}`

          requestPath && requestsMapper.addEntry(requestPath, requestID)
        })
      }
    }
  })

  return userRequestCreatedSub
}

function setupUserRequestUpdatedSubscription() {
  const [userRequestUpdated$, userRequestUpdatedSub] =
    runUserRequestUpdatedSubscription()

  userRequestUpdated$.subscribe((res) => {
    if (E.isRight(res)) {
      const requestType = res.right.userRequestUpdated.type

      const { requestsMapper, collectionsMapper } =
        getMappersAndStoreByType(requestType)

      const requestPath = requestsMapper.getLocalIDByBackendID(
        res.right.userRequestUpdated.id
      )

      const indexes = requestPath?.split("/")
      const requestIndex = indexes && indexes[indexes?.length - 1]
      const requestParentPath = collectionsMapper.getLocalIDByBackendID(
        res.right.userRequestUpdated.collectionID
      )

      requestIndex &&
        requestParentPath &&
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? editRESTRequest(
                requestParentPath,
                parseInt(requestIndex),
                JSON.parse(res.right.userRequestUpdated.request)
              )
            : editGraphqlRequest(
                requestParentPath,
                parseInt(requestIndex),
                JSON.parse(res.right.userRequestUpdated.request)
              )
        })
    }
  })

  return userRequestUpdatedSub
}

function setupUserRequestMovedSubscription() {
  const [userRequestMoved$, userRequestMovedSub] =
    runUserRequestMovedSubscription()

  userRequestMoved$.subscribe((res) => {
    if (E.isRight(res)) {
      const requestType = res.right.userRequestMoved.request.type

      const { collectionsMapper } = getMappersAndStoreByType(requestType)

      const requestID = res.right.userRequestMoved.request.id
      const requestIndex = getRequestIndexFromRequestID(requestID)

      const sourceCollectionPath = getCollectionPathFromRequestID(requestID)

      const destinationCollectionID =
        res.right.userRequestMoved.request.collectionID
      const destinationCollectionPath = collectionsMapper.getLocalIDByBackendID(
        destinationCollectionID
      )

      const nextRequest = res.right.userRequestMoved.nextRequest

      // there is no nextRequest, so request is moved
      if (
        requestIndex &&
        sourceCollectionPath &&
        destinationCollectionPath &&
        !nextRequest
      ) {
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? moveRESTRequest(
                sourceCollectionPath,
                parseInt(requestIndex),
                destinationCollectionPath
              )
            : moveGraphqlRequest(
                sourceCollectionPath,
                parseInt(requestIndex),
                destinationCollectionPath
              )
        })
      }

      // there is nextRequest, so request is reordered
      if (
        requestIndex &&
        sourceCollectionPath &&
        destinationCollectionPath &&
        nextRequest &&
        // we don't have request reordering for graphql yet
        requestType == "REST"
      ) {
        const nextRequestIndex = getRequestIndexFromRequestID(nextRequest.id)

        nextRequestIndex &&
          runDispatchWithOutSyncing(() => {
            updateRESTRequestOrder(
              parseInt(requestIndex),
              parseInt(nextRequestIndex),
              destinationCollectionPath
            )
          })
      }
    }
  })

  return userRequestMovedSub
}

function setupUserRequestDeletedSubscription() {
  const [userRequestDeleted$, userRequestDeletedSub] =
    runUserRequestDeletedSubscription()

  userRequestDeleted$.subscribe((res) => {
    if (E.isRight(res)) {
      const requestType = res.right.userRequestDeleted.type

      const { requestsMapper, collectionsMapper } =
        getMappersAndStoreByType(requestType)

      const deletedRequestPath = requestsMapper.getLocalIDByBackendID(
        res.right.userRequestDeleted.id
      )

      const indexes = deletedRequestPath?.split("/")
      const requestIndex = indexes && indexes[indexes?.length - 1]
      const requestParentPath = collectionsMapper.getLocalIDByBackendID(
        res.right.userRequestDeleted.collectionID
      )

      requestIndex &&
        requestParentPath &&
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? removeRESTRequest(requestParentPath, parseInt(requestIndex))
            : removeGraphqlRequest(requestParentPath, parseInt(requestIndex))
        })

      deletedRequestPath &&
        reorderIndexesAfterEntryRemoval(
          deletedRequestPath,
          requestsMapper,
          requestType
        )
    }
  })

  return userRequestDeletedSub
}

export const def: CollectionsPlatformDef = {
  initCollectionsSync,
}

function getRequestIndexFromRequestID(requestID: string) {
  const requestPath = restRequestsMapper.getLocalIDByBackendID(requestID)

  /**
   * requestPath is in the form collectionPath/requestIndex,
   * so to get requestIndex we just split the requestPath with / and get the last element
   */
  const requestPathIndexes = requestPath?.split("/")
  const requestIndex =
    requestPathIndexes && requestPathIndexes[requestPathIndexes?.length - 1]

  return requestIndex
}

function getCollectionPathFromRequestID(requestID: string) {
  const requestPath = restRequestsMapper.getLocalIDByBackendID(requestID)
  const requestPathIndexes = requestPath?.split("/")

  // requestIndex will be the last element, remove it
  requestPathIndexes?.pop()

  return requestPathIndexes?.join("/")
}

function hasReorderingOrMovingAlreadyHappened(
  incomingOperation: {
    sourceCollectionID: string
    destinationCollectionID: string | undefined
    sourcePath: string | undefined
    destinationPath: string | undefined
  },
  type: "REORDERING" | "MOVING"
) {
  const {
    sourcePath,
    sourceCollectionID,
    destinationCollectionID,
    destinationPath,
  } = incomingOperation

  // TODO: implement this as a module
  // Something like, SyncOperations.hasAlreadyHappened( type: "REORDER_COLLECTIONS", payload )
  return !!collectionReorderOrMovingOperations.find((reorderOperation) =>
    reorderOperation.sourceCollectionID == sourceCollectionID &&
    reorderOperation.destinationCollectionID == destinationCollectionID &&
    type == "MOVING"
      ? reorderOperation.reorderOperation.fromPath == destinationPath
      : reorderOperation.reorderOperation.fromPath == sourcePath &&
        type == "MOVING"
      ? reorderOperation.reorderOperation.toPath == sourcePath
      : reorderOperation.reorderOperation.toPath == destinationPath
  )
}
