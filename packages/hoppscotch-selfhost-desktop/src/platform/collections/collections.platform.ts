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
import { collectionsSyncer, getStoreByCollectionType } from "./collections.sync"

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
  restCollectionStore,
} from "@hoppscotch/common/newstore/collections"
import { runGQLSubscription } from "@hoppscotch/common/helpers/backend/GQLClient"
import {
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { gqlCollectionsSyncer } from "./gqlCollections.sync"
import { ReqType } from "../../api/generated/graphql"

function initCollectionsSync() {
  const currentUser$ = platformAuth.getCurrentUserStream()
  collectionsSyncer.startStoreSync()
  collectionsSyncer.setupSubscriptions(setupSubscriptions)

  gqlCollectionsSyncer.startStoreSync()

  loadUserCollections("REST")
  loadUserCollections("GQL")

  // TODO: test & make sure the auth thing is working properly
  currentUser$.subscribe(async (user) => {
    if (user) {
      loadUserCollections("REST")
      loadUserCollections("GQL")
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
): HoppCollection {
  if (collectionType == "REST") {
    const restCollection = collection as ExportedUserCollectionREST

    return {
      id: restCollection.id,
      v: 1,
      name: restCollection.name,
      folders: restCollection.folders.map((folder) =>
        exportedCollectionToHoppCollection(folder, collectionType)
      ),
      requests: restCollection.requests.map((request) => {
        const requestParsedResult = HoppRESTRequest.safeParse(request)
        if (requestParsedResult.type === "ok") {
          return requestParsedResult.value
        }

        const {
          v,
          id,
          auth,
          body,
          endpoint,
          headers,
          method,
          name,
          params,
          preRequestScript,
          testScript,
          requestVariables,
        } = request
        return {
          v,
          id,
          name,
          endpoint,
          method,
          params,
          requestVariables: requestVariables,
          auth,
          headers,
          body,
          preRequestScript,
          testScript,
        }
      }),
    }
  } else {
    const gqlCollection = collection as ExportedUserCollectionGQL

    return {
      id: gqlCollection.id,
      v: 1,
      name: gqlCollection.name,
      folders: gqlCollection.folders.map((folder) =>
        exportedCollectionToHoppCollection(folder, collectionType)
      ),
      requests: gqlCollection.requests.map(
        ({ v, auth, headers, name, id }) => ({
          id,
          v,
          auth,
          headers,
          name,
        })
      ) as HoppGQLRequest[],
    }
  }
}

async function loadUserCollections(collectionType: "REST" | "GQL") {
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
                ) as HoppCollection
            )
          )
        : setGraphqlCollections(
            exportedCollections.map(
              (collection) =>
                exportedCollectionToHoppCollection(
                  collection,
                  "GQL"
                ) as HoppCollection
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

      const { collectionStore } = getStoreByCollectionType(collectionType)

      const userCollectionBackendID = res.right.userCollectionCreated.id
      const parentCollectionID = res.right.userCollectionCreated.parent?.id

      const userCollectionLocalID = getCollectionPathFromCollectionID(
        userCollectionBackendID,
        collectionStore.value.state
      )

      // collection already exists in store ( this instance created it )
      if (userCollectionLocalID) {
        return
      }

      const parentCollectionPath =
        parentCollectionID &&
        getCollectionPathFromCollectionID(
          parentCollectionID,
          collectionStore.value.state
        )

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

            const addedFolder = parentCollection.folders[folderIndex]
            addedFolder.id = userCollectionBackendID
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

          const addedCollection = collectionStore.value.state[localIndex]
          addedCollection.id = userCollectionBackendID
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

      const { collectionStore } = getStoreByCollectionType(collectionType)

      const updatedCollectionBackendID = res.right.userCollectionUpdated.id
      const updatedCollectionLocalPath = getCollectionPathFromCollectionID(
        updatedCollectionBackendID,
        collectionStore.value.state
      )

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

      const sourcePath = getCollectionPathFromCollectionID(
        movedMetadata.id,
        restCollectionStore.value.state
      )

      let destinationPath: string | undefined

      if (movedMetadata.parent?.id) {
        destinationPath =
          getCollectionPathFromCollectionID(
            movedMetadata.parent?.id,
            restCollectionStore.value.state
          ) ?? undefined
      }

      sourcePath &&
        runDispatchWithOutSyncing(() => {
          moveRESTFolder(sourcePath, destinationPath ?? null)
        })
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

      const { collectionStore } = getStoreByCollectionType(collectionType)

      const removedCollectionLocalPath = getCollectionPathFromCollectionID(
        removedCollectionBackendID,
        collectionStore.value.state
      )

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

      const sourcePath = getCollectionPathFromCollectionID(
        sourceCollectionID,
        restCollectionStore.value.state
      )

      let destinationPath: string | null | undefined

      if (destinationCollectionID) {
        destinationPath = getCollectionPathFromCollectionID(
          destinationCollectionID,
          restCollectionStore.value.state
        )
      }

      runDispatchWithOutSyncing(() => {
        if (sourcePath) {
          updateRESTCollectionOrder(sourcePath, destinationPath ?? null)
        }
      })
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

      const { collectionStore } = getStoreByCollectionType(requestType)

      const hasAlreadyHappened = getRequestPathFromRequestID(
        requestID,
        collectionStore.value.state
      )

      if (!!hasAlreadyHappened) {
        return
      }

      const collectionPath = getCollectionPathFromCollectionID(
        collectionID,
        collectionStore.value.state
      )

      if (collectionID && collectionPath) {
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? saveRESTRequestAs(collectionPath, request)
            : saveGraphqlRequestAs(collectionPath, request)

          const target = navigateToFolderWithIndexPath(
            collectionStore.value.state,
            collectionPath.split("/").map((index) => parseInt(index))
          )

          const targetRequest = target?.requests[target?.requests.length - 1]

          if (targetRequest) {
            targetRequest.id = requestID
          }
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

      const { collectionStore } = getStoreByCollectionType(requestType)

      const requestPath = getRequestPathFromRequestID(
        res.right.userRequestUpdated.id,
        collectionStore.value.state
      )

      const collectionPath = requestPath?.collectionPath
      const requestIndex = requestPath?.requestIndex

      ;(requestIndex || requestIndex == 0) &&
        collectionPath &&
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? editRESTRequest(
                collectionPath,
                requestIndex,
                JSON.parse(res.right.userRequestUpdated.request)
              )
            : editGraphqlRequest(
                collectionPath,
                requestIndex,
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
      const { request, nextRequest } = res.right.userRequestMoved

      const {
        collectionID: destinationCollectionID,
        id: sourceRequestID,
        type: requestType,
      } = request

      const { collectionStore } = getStoreByCollectionType(requestType)

      const sourceRequestPath = getRequestPathFromRequestID(
        sourceRequestID,
        collectionStore.value.state
      )

      const destinationCollectionPath = getCollectionPathFromCollectionID(
        destinationCollectionID,
        collectionStore.value.state
      )

      const destinationRequestIndex = destinationCollectionPath
        ? (() => {
            const requestsLength = navigateToFolderWithIndexPath(
              collectionStore.value.state,
              destinationCollectionPath
                .split("/")
                .map((index) => parseInt(index))
            )?.requests.length

            return requestsLength || requestsLength == 0
              ? requestsLength - 1
              : undefined
          })()
        : undefined

      // there is no nextRequest, so request is moved
      if (
        (destinationRequestIndex || destinationRequestIndex == 0) &&
        destinationCollectionPath &&
        sourceRequestPath &&
        !nextRequest
      ) {
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? moveRESTRequest(
                sourceRequestPath.collectionPath,
                sourceRequestPath.requestIndex,
                destinationCollectionPath
              )
            : moveGraphqlRequest(
                sourceRequestPath.collectionPath,
                sourceRequestPath.requestIndex,
                destinationCollectionPath
              )
        })
      }

      // there is nextRequest, so request is reordered
      if (
        (destinationRequestIndex || destinationRequestIndex == 0) &&
        destinationCollectionPath &&
        nextRequest &&
        // we don't have request reordering for graphql yet
        requestType == "REST"
      ) {
        const { collectionID: nextCollectionID, id: nextRequestID } =
          nextRequest

        const nextCollectionPath =
          getCollectionPathFromCollectionID(
            nextCollectionID,
            collectionStore.value.state
          ) ?? undefined

        const nextRequestIndex = nextCollectionPath
          ? getRequestIndex(
              nextRequestID,
              nextCollectionPath,
              collectionStore.value.state
            )
          : undefined

        nextRequestIndex &&
          nextCollectionPath &&
          sourceRequestPath &&
          runDispatchWithOutSyncing(() => {
            updateRESTRequestOrder(
              sourceRequestPath?.requestIndex,
              nextRequestIndex,
              nextCollectionPath
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

      const { collectionStore } = getStoreByCollectionType(requestType)

      const deletedRequestPath = getRequestPathFromRequestID(
        res.right.userRequestDeleted.id,
        collectionStore.value.state
      )

      ;(deletedRequestPath?.requestIndex ||
        deletedRequestPath?.requestIndex == 0) &&
        deletedRequestPath.collectionPath &&
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? removeRESTRequest(
                deletedRequestPath.collectionPath,
                deletedRequestPath.requestIndex
              )
            : removeGraphqlRequest(
                deletedRequestPath.collectionPath,
                deletedRequestPath.requestIndex
              )
        })
    }
  })

  return userRequestDeletedSub
}

export const def: CollectionsPlatformDef = {
  initCollectionsSync,
}

function getCollectionPathFromCollectionID(
  collectionID: string,
  collections: HoppCollection[],
  parentPath?: string
): string | null {
  for (const collectionIndex in collections) {
    if (collections[collectionIndex].id == collectionID) {
      return parentPath
        ? `${parentPath}/${collectionIndex}`
        : `${collectionIndex}`
    } else {
      const collectionPath = getCollectionPathFromCollectionID(
        collectionID,
        collections[collectionIndex].folders,
        parentPath ? `${parentPath}/${collectionIndex}` : `${collectionIndex}`
      )

      if (collectionPath) return collectionPath
    }
  }

  return null
}

function getRequestPathFromRequestID(
  requestID: string,
  collections: HoppCollection[],
  parentPath?: string
): { collectionPath: string; requestIndex: number } | null {
  for (const collectionIndex in collections) {
    const requestIndex = collections[collectionIndex].requests.findIndex(
      (request) => request.id == requestID
    )

    if (requestIndex != -1) {
      return {
        collectionPath: parentPath
          ? `${parentPath}/${collectionIndex}`
          : `${collectionIndex}`,
        requestIndex,
      }
    } else {
      const requestPath = getRequestPathFromRequestID(
        requestID,
        collections[collectionIndex].folders,
        parentPath ? `${parentPath}/${collectionIndex}` : `${collectionIndex}`
      )

      if (requestPath) return requestPath
    }
  }

  return null
}

function getRequestIndex(
  requestID: string,
  parentCollectionPath: string,
  collections: HoppCollection[]
) {
  const collection = navigateToFolderWithIndexPath(
    collections,
    parentCollectionPath?.split("/").map((index) => parseInt(index))
  )

  const requestIndex = collection?.requests.findIndex(
    (request) => request.id == requestID
  )

  return requestIndex
}
