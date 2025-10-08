import { HoppCollection } from "@hoppscotch/data"
import { navigateToFolderWithIndexPath } from "../../newstore/collections"
import * as E from "fp-ts/Either"
import { transformCollectionForBackend } from "./sync"
import {
  CollectionAPI,
  SyncContext,
  serializeCollectionData,
  createRecursiveSyncCollections,
  getCollectionIndexFromPath,
  getParentPathIndexesFromPath,
  getIndexesAfterReorder,
  getPathsAfterMoving,
  createMoveOrReorderRequests,
} from "./syncCore"

/**
 * Factory function to create complete sync definitions with shared logic
 * This eliminates most of the duplication across platforms
 */

export interface SyncDefinitionConfig {
  api: CollectionAPI
  collectionStore: any
  reqType: any
  removeDuplicateFunction: (id: string, path: string, type?: string) => void
}

export const createSyncDefinition = (config: SyncDefinitionConfig) => {
  const context: SyncContext = {
    api: config.api,
    collectionStore: config.collectionStore,
    reqType: config.reqType,
    removeDuplicateFunction: config.removeDuplicateFunction,
  }

  const recursivelySyncCollections = createRecursiveSyncCollections(context)
  const moveOrReorderRequests = createMoveOrReorderRequests(context)

  return {
    async appendCollections({ entries }: { entries: HoppCollection[] }) {
      // Transform collections to backend format
      const transformedCollections = entries.map(transformCollectionForBackend)

      // Use bulk import API for better performance
      const result = await config.api.importUserCollectionsFromJSON(
        JSON.stringify(transformedCollections),
        config.reqType,
        undefined // parentCollectionID is undefined for root collections
      )

      if (E.isLeft(result)) {
        console.error("Failed to append collections:", result.left)
        // Fallback to individual creation if bulk import fails
        let indexStart =
          config.collectionStore.value.state.length - entries.length
        entries.forEach((collection) => {
          recursivelySyncCollections(collection, `${indexStart}`)
          indexStart++
        })
      }
    },

    async addCollection({ collection }: { collection: HoppCollection }) {
      const lastCreatedCollectionIndex =
        config.collectionStore.value.state.length - 1
      await recursivelySyncCollections(
        collection,
        `${lastCreatedCollectionIndex}`
      )
    },

    async removeCollection({ collectionID }: { collectionID: string }) {
      if (collectionID) {
        await config.api.deleteUserCollection(collectionID)
      }
    },

    editCollection({
      partialCollection,
      collectionIndex,
    }: {
      partialCollection: Partial<HoppCollection>
      collectionIndex: number
    }) {
      const collectionID = navigateToFolderWithIndexPath(
        config.collectionStore.value.state,
        [collectionIndex]
      )?.id

      if (collectionID && partialCollection.name) {
        const data = serializeCollectionData(partialCollection)
        config.api.updateUserCollection(
          collectionID,
          partialCollection.name,
          data
        )
      }
    },

    async addFolder({ name, path }: { name: string; path: string }) {
      const parentCollection = navigateToFolderWithIndexPath(
        config.collectionStore.value.state,
        path.split("/").map((index) => parseInt(index))
      )

      const parentCollectionBackendID = parentCollection?.id

      if (parentCollectionBackendID) {
        const res = await config.api.createRESTChildUserCollection(
          name,
          parentCollectionBackendID
        )

        if (E.isRight(res)) {
          const { id } = (res.right as any).createRESTChildUserCollection

          // Always try to assign the ID to the last created folder
          const foldersLength = parentCollection.folders.length
          if (foldersLength > 0) {
            const lastFolderIndex = foldersLength - 1
            const lastFolder = parentCollection.folders[lastFolderIndex]

            // Only assign ID if the folder doesn't already have one (avoid overwriting)
            if (!lastFolder.id) {
              lastFolder.id = id
              config.removeDuplicateFunction(id, `${path}/${lastFolderIndex}`)
            }
          }
        }
      }
    },

    editFolder({
      folder,
      path,
    }: {
      folder: Partial<HoppCollection>
      path: string
    }) {
      const folderID = navigateToFolderWithIndexPath(
        config.collectionStore.value.state,
        path.split("/").map((index) => parseInt(index))
      )?.id

      if (folderID && folder.name) {
        const data = serializeCollectionData(folder)
        config.api.updateUserCollection(folderID, folder.name, data)
      }
    },

    async removeFolder({ folderID }: { folderID: string }) {
      if (folderID) {
        await config.api.deleteUserCollection(folderID)
      }
    },

    async moveFolder({
      destinationPath,
      path,
    }: {
      destinationPath?: string
      path: string
    }) {
      const { newSourcePath, newDestinationPath } = getPathsAfterMoving(
        path,
        destinationPath,
        config.collectionStore
      )

      if (newSourcePath) {
        const sourceCollectionID = navigateToFolderWithIndexPath(
          config.collectionStore.value.state,
          newSourcePath.split("/").map((index) => parseInt(index))
        )?.id

        const destinationCollectionID =
          destinationPath && newDestinationPath
            ? navigateToFolderWithIndexPath(
                config.collectionStore.value.state,
                newDestinationPath.split("/").map((index) => parseInt(index))
              )?.id
            : undefined

        if (sourceCollectionID) {
          await config.api.moveUserCollection(
            sourceCollectionID,
            destinationCollectionID
          )
        }
      }
    },

    editRequest({
      path,
      requestIndex,
      requestNew,
    }: {
      path: string
      requestIndex: number
      requestNew: any
    }) {
      const request = navigateToFolderWithIndexPath(
        config.collectionStore.value.state,
        path.split("/").map((index) => parseInt(index))
      )?.requests[requestIndex]

      const requestBackendID = request?.id

      if (requestBackendID) {
        config.api.editUserRequest(
          requestBackendID,
          requestNew.name,
          JSON.stringify(requestNew)
        )
      }
    },

    async saveRequestAs({ path, request }: { path: string; request: any }) {
      const folder = navigateToFolderWithIndexPath(
        config.collectionStore.value.state,
        path.split("/").map((index) => parseInt(index))
      )

      const parentCollectionBackendID = folder?.id

      if (parentCollectionBackendID) {
        const res = await config.api.createRESTUserRequest(
          request.name,
          JSON.stringify(request),
          parentCollectionBackendID
        )

        if (E.isRight(res)) {
          const { id } = (res.right as any).createRESTUserRequest

          // Find the last request that doesn't have an ID (the newly added one)
          const requestsLength = folder.requests.length
          if (requestsLength > 0) {
            const lastRequestIndex = requestsLength - 1
            const lastRequest = folder.requests[lastRequestIndex]

            // Only assign ID if the request doesn't already have one
            if (!lastRequest.id) {
              lastRequest.id = id
              config.removeDuplicateFunction(
                id,
                `${path}/${lastRequestIndex}`,
                "request"
              )
            }
          }
        }
      }
    },

    async removeRequest({ requestID }: { requestID: string }) {
      if (requestID) {
        await config.api.deleteUserRequest(requestID)
      }
    },

    moveRequest({
      destinationPath,
      path,
      requestIndex,
    }: {
      destinationPath: string
      path: string
      requestIndex: number
    }) {
      moveOrReorderRequests(requestIndex, path, destinationPath)
    },

    updateRequestOrder({
      destinationCollectionPath,
      destinationRequestIndex,
      requestIndex,
    }: {
      destinationCollectionPath: string
      destinationRequestIndex?: number
      requestIndex: number
    }) {
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
    }: {
      collectionIndex: string
      destinationCollectionIndex?: string
    }) {
      const collections = config.collectionStore.value.state
      const sourcePathIndexes = getParentPathIndexesFromPath(collectionPath)
      const sourceCollectionIndex = getCollectionIndexFromPath(collectionPath)
      const destinationCollectionIndex = destinationCollectionPath
        ? getCollectionIndexFromPath(destinationCollectionPath)
        : undefined

      let updatedCollectionIndexs:
        | [newSourceIndex: number, newDestinationIndex: number | undefined]
        | undefined

      if (
        (sourceCollectionIndex || sourceCollectionIndex === 0) &&
        (destinationCollectionIndex || destinationCollectionIndex === 0)
      ) {
        updatedCollectionIndexs = getIndexesAfterReorder(
          sourceCollectionIndex,
          destinationCollectionIndex
        )
      } else if (sourceCollectionIndex || sourceCollectionIndex === 0) {
        if (sourcePathIndexes.length === 0) {
          // we're reordering root collections
          updatedCollectionIndexs = [collections.length - 1, undefined]
        } else {
          const sourceCollection = navigateToFolderWithIndexPath(collections, [
            ...sourcePathIndexes,
          ])

          if (sourceCollection && sourceCollection.folders.length > 0) {
            updatedCollectionIndexs = [
              sourceCollection.folders.length - 1,
              undefined,
            ]
          }
        }
      }

      const sourceCollectionID =
        updatedCollectionIndexs &&
        navigateToFolderWithIndexPath(collections, [
          ...sourcePathIndexes,
          updatedCollectionIndexs[0],
        ])?.id

      const destinationCollectionID =
        updatedCollectionIndexs &&
        (updatedCollectionIndexs[1] || updatedCollectionIndexs[1] === 0)
          ? navigateToFolderWithIndexPath(collections, [
              ...sourcePathIndexes,
              updatedCollectionIndexs[1],
            ])?.id
          : undefined

      if (sourceCollectionID) {
        await config.api.updateUserCollectionOrder(
          sourceCollectionID,
          destinationCollectionID
        )
      }
    },
  }
}
