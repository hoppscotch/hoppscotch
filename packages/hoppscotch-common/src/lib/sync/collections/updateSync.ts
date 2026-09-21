import {
  HoppCollection,
  HoppRESTRequest,
  HoppGQLRequest,
} from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { stripClientLocalValuesForWire } from "~/helpers/clientLocalVariables"
import { settingsStore } from "~/newstore/settings"
import { platform } from "~/platform"
import {
  createRESTChildUserCollection,
  createRESTUserRequest,
  deleteUserCollection,
  deleteUserRequest,
  editUserRequest,
  moveUserRequest,
  updateUserCollection,
} from "./api"

/**
 * Synchronizes the diff of an updated personal REST collection tree with the backend.
 * Handles created, updated, deleted, and moved folders and requests so that backend
 * state remains strictly consistent with local changes for logged-in users.
 */
export async function syncPersonalRESTCollectionUpdate(
  originalCollection: HoppCollection,
  finalCollection: HoppCollection
): Promise<E.Either<string, HoppCollection>> {
  const isSyncActive =
    settingsStore.value.syncCollections &&
    platform.auth.getCurrentUser() &&
    !!originalCollection.id

  // If personal sync is not active or collection was never synced to backend, no backend sync is needed
  if (!isSyncActive) {
    return E.right(finalCollection)
  }

  try {
    const originalRequestParents = new Map<string, string>()
    const originalFolders = new Map<string, HoppCollection>()
    const updatedFolderIds = new Set<string>()
    const updatedRequestIds = new Set<string>()

    function collectOriginalNodes(
      collection: HoppCollection,
      parentId: string | null = null
    ) {
      if (collection.id && parentId) {
        originalFolders.set(collection.id, collection)
      }
      const currentCollectionId = collection.id
      if (currentCollectionId) {
        for (const req of collection.requests) {
          if (req.id) {
            originalRequestParents.set(req.id, currentCollectionId)
          }
        }
      }
      for (const folder of collection.folders) {
        if (currentCollectionId) {
          collectOriginalNodes(folder, currentCollectionId)
        }
      }
    }
    collectOriginalNodes(originalCollection)

    function collectUpdatedIds(collection: HoppCollection) {
      if (collection.id) {
        updatedFolderIds.add(collection.id)
      }
      for (const req of collection.requests) {
        if (req.id) {
          updatedRequestIds.add(req.id)
        }
      }
      for (const folder of collection.folders) {
        collectUpdatedIds(folder)
      }
    }
    collectUpdatedIds(finalCollection)

    // 1. Delete removed requests
    for (const [reqId] of originalRequestParents.entries()) {
      if (!updatedRequestIds.has(reqId)) {
        const delRes = await deleteUserRequest(reqId)
        if (E.isLeft(delRes)) {
          console.warn(`Failed to delete request ${reqId}:`, delRes.left)
        }
      }
    }

    // 2. Delete removed folders
    for (const [folderId] of originalFolders.entries()) {
      if (!updatedFolderIds.has(folderId)) {
        const delRes = await deleteUserCollection(folderId)
        if (E.isLeft(delRes)) {
          console.warn(`Failed to delete collection ${folderId}:`, delRes.left)
        }
      }
    }

    // 3. Update root collection metadata
    const rootData = {
      auth: finalCollection.auth,
      headers: finalCollection.headers,
      variables: stripClientLocalValuesForWire(finalCollection.variables),
      _ref_id: finalCollection._ref_id,
      description: finalCollection.description ?? null,
      preRequestScript: finalCollection.preRequestScript ?? "",
      testScript: finalCollection.testScript ?? "",
    }
    const rootRes = await updateUserCollection(
      originalCollection.id!,
      finalCollection.name,
      JSON.stringify(rootData)
    )
    if (E.isLeft(rootRes)) {
      return E.left(rootRes.left)
    }
    finalCollection.id = originalCollection.id

    // Helper to sync requests in a collection or folder
    async function syncRequestsInCollection(
      requests: (HoppRESTRequest | HoppGQLRequest)[],
      collectionId: string
    ): Promise<E.Either<string, void>> {
      for (const req of requests) {
        if (req.id) {
          const oldParentId = originalRequestParents.get(req.id)
          if (oldParentId && oldParentId !== collectionId) {
            const moveRes = await moveUserRequest(
              oldParentId,
              collectionId,
              req.id
            )
            if (E.isLeft(moveRes)) {
              console.warn(`Failed to move request ${req.id}:`, moveRes.left)
            }
          }
          const editRes = await editUserRequest(
            req.id,
            req.name,
            JSON.stringify(req)
          )
          if (E.isLeft(editRes)) {
            return E.left(editRes.left)
          }
        } else {
          const createRes = await createRESTUserRequest(
            req.name,
            JSON.stringify(req),
            collectionId
          )
          if (E.isLeft(createRes)) {
            return E.left(createRes.left)
          }
          req.id = createRes.right.createRESTUserRequest.id
        }
      }
      return E.right(undefined)
    }

    // Helper to sync a folder subtree
    async function syncFolder(
      folder: HoppCollection,
      parentCollectionId: string
    ): Promise<E.Either<string, void>> {
      const folderData = {
        auth: folder.auth,
        headers: folder.headers,
        variables: stripClientLocalValuesForWire(folder.variables),
        _ref_id: folder._ref_id,
        description: folder.description ?? null,
        preRequestScript: folder.preRequestScript ?? "",
        testScript: folder.testScript ?? "",
      }

      let currentFolderId = folder.id

      if (currentFolderId) {
        const updateRes = await updateUserCollection(
          currentFolderId,
          folder.name,
          JSON.stringify(folderData)
        )
        if (E.isLeft(updateRes)) {
          return E.left(updateRes.left)
        }
      } else {
        const createRes = await createRESTChildUserCollection(
          folder.name,
          parentCollectionId,
          JSON.stringify(folderData)
        )
        if (E.isLeft(createRes)) {
          return E.left(createRes.left)
        }
        currentFolderId = createRes.right.createRESTChildUserCollection.id
        folder.id = currentFolderId
      }

      const reqResult = await syncRequestsInCollection(
        folder.requests,
        currentFolderId
      )
      if (E.isLeft(reqResult)) {
        return reqResult
      }

      for (const sub of folder.folders) {
        const subResult = await syncFolder(sub, currentFolderId)
        if (E.isLeft(subResult)) {
          return subResult
        }
      }

      return E.right(undefined)
    }

    // 4. Sync root requests
    const rootReqRes = await syncRequestsInCollection(
      finalCollection.requests,
      originalCollection.id!
    )
    if (E.isLeft(rootReqRes)) {
      return rootReqRes
    }

    // 5. Sync root folders
    for (const folder of finalCollection.folders) {
      const folderRes = await syncFolder(folder, originalCollection.id!)
      if (E.isLeft(folderRes)) {
        return folderRes
      }
    }

    return E.right(finalCollection)
  } catch (e: any) {
    return E.left(
      e?.message ?? "Failed to synchronize collection update with backend"
    )
  }
}
