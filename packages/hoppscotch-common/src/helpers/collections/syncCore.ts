import { HoppCollection, generateUniqueRefId } from "@hoppscotch/data"
import {
  navigateToFolderWithIndexPath,
  removeDuplicateRESTCollectionOrFolder,
} from "../../newstore/collections"
import * as E from "fp-ts/Either"

/**
 * Core sync utilities shared across all platforms
 */

export interface CollectionAPI {
  createRESTRootUserCollection: (
    name: string,
    data: string
  ) => Promise<E.Either<any, any>>
  createRESTChildUserCollection: (
    name: string,
    parentID: string,
    data?: string
  ) => Promise<E.Either<any, any>>
  createRESTUserRequest: (
    name: string,
    data: string,
    collectionID: string
  ) => Promise<E.Either<any, any>>
  deleteUserCollection: (id: string) => Promise<any>
  deleteUserRequest: (id: string) => Promise<any>
  editUserRequest: (id: string, name: string, data: string) => Promise<any>
  updateUserCollection: (id: string, name: string, data: string) => Promise<any>
  moveUserCollection: (sourceID: string, destinationID?: string) => Promise<any>
  moveUserRequest: (
    sourceCollectionID: string,
    destCollectionID: string,
    requestID: string,
    nextRequestID?: string
  ) => Promise<any>
  updateUserCollectionOrder: (
    collectionID: string,
    nextCollectionID?: string
  ) => Promise<any>
  importUserCollectionsFromJSON: (
    jsonString: string,
    reqType: any,
    parentID?: string
  ) => Promise<E.Either<any, any>>
}

export interface SyncContext {
  api: CollectionAPI
  collectionStore: any
  reqType: any
  removeDuplicateFunction: typeof removeDuplicateRESTCollectionOrFolder
}

/**
 * Shared collection data serialization
 */
export const serializeCollectionData = (
  collection: Partial<HoppCollection>
) => {
  return JSON.stringify({
    auth: collection.auth ?? {
      authType: "inherit",
      authActive: true,
    },
    headers: collection.headers ?? [],
    variables: collection.variables ?? [],
    _ref_id: collection._ref_id,
  })
}

/**
 * Shared recursive sync collections implementation
 */
export const createRecursiveSyncCollections = (context: SyncContext) => {
  return async (
    collection: HoppCollection,
    collectionPath: string,
    parentUserCollectionID?: string
  ) => {
    let parentCollectionID = parentUserCollectionID

    // Create root or child collection
    if (!parentUserCollectionID) {
      const data = serializeCollectionData(collection)
      const res = await context.api.createRESTRootUserCollection(
        collection.name,
        data
      )

      if (E.isRight(res)) {
        parentCollectionID = (res.right as any).createRESTRootUserCollection.id
        const returnedData = (res.right as any).createRESTRootUserCollection
          .data
          ? JSON.parse((res.right as any).createRESTRootUserCollection.data)
          : {
              auth: { authType: "inherit", authActive: true },
              headers: [],
              variables: [],
              _ref_id: generateUniqueRefId("coll"),
            }

        collection.id = parentCollectionID
        collection._ref_id = returnedData._ref_id ?? generateUniqueRefId("coll")
        collection.auth = returnedData.auth
        collection.headers = returnedData.headers
        collection.variables = returnedData.variables
        if (parentCollectionID) {
          context.removeDuplicateFunction(parentCollectionID, collectionPath)
        }
      } else {
        parentCollectionID = undefined
      }
    } else {
      const data = serializeCollectionData(collection)
      const res = await context.api.createRESTChildUserCollection(
        collection.name,
        parentUserCollectionID,
        data
      )

      if (E.isRight(res)) {
        const childCollectionId = (res.right as any)
          .createRESTChildUserCollection.id
        const returnedData = (res.right as any).createRESTChildUserCollection
          .data
          ? JSON.parse((res.right as any).createRESTChildUserCollection.data)
          : {
              auth: { authType: "inherit", authActive: true },
              headers: [],
              variables: [],
              _ref_id: generateUniqueRefId("coll"),
            }

        collection.id = childCollectionId
        collection._ref_id = returnedData._ref_id ?? generateUniqueRefId("coll")
        collection.auth = returnedData.auth
        collection.headers = returnedData.headers
        collection.variables = returnedData.variables
        parentCollectionID = childCollectionId

        context.removeDuplicateFunction(childCollectionId, collectionPath)
      }
    }

    // Create requests
    if (parentCollectionID) {
      collection.requests.forEach(async (request) => {
        const res = await context.api.createRESTUserRequest(
          request.name,
          JSON.stringify(request),
          parentCollectionID!
        )

        if (res && E.isRight(res)) {
          request.id = (res.right as any).createRESTUserRequest.id
        }
      })
    }

    // Create child collections recursively
    if (parentCollectionID) {
      collection.folders.forEach(async (folder, index) => {
        const recursiveSync = createRecursiveSyncCollections(context)
        await recursiveSync(
          folder,
          `${collectionPath}/${index}`,
          parentCollectionID
        )
      })
    }
  }
}

/**
 * Path manipulation utilities
 */
export const getCollectionIndexFromPath = (
  collectionPath: string
): number | undefined => {
  const sourceCollectionIndexString = collectionPath.split("/").pop()
  return sourceCollectionIndexString
    ? parseInt(sourceCollectionIndexString)
    : undefined
}

export const getParentPathIndexesFromPath = (path: string): number[] => {
  const indexes = path.split("/")
  indexes.pop()
  return indexes.map((index) => parseInt(index))
}

export const getParentPathFromPath = (path: string | undefined): string => {
  const indexes = path ? path.split("/") : []
  indexes.pop()
  return indexes.join("/")
}

export const getIndexesAfterReorder = (
  oldSourceIndex: number,
  oldDestinationIndex: number
): [newSourceIndex: number, newDestinationIndex: number] => {
  if (oldSourceIndex < oldDestinationIndex) {
    return [oldDestinationIndex - 1, oldDestinationIndex]
  }
  if (oldSourceIndex > oldDestinationIndex) {
    return [oldDestinationIndex, oldDestinationIndex + 1]
  }
  throw new Error("Source and Destination are the same")
}

export const getPathsAfterMoving = (
  sourcePath: string,
  destinationPath: string | undefined,
  collectionStore: any
) => {
  if (!destinationPath) {
    return {
      newSourcePath: `${collectionStore.value.state.length - 1}`,
      newDestinationPath: destinationPath,
    }
  }

  const sourceParentPath = getParentPathFromPath(sourcePath)
  const destinationParentPath = getParentPathFromPath(destinationPath)
  const isSameParentPath = sourceParentPath === destinationParentPath

  let newDestinationPath: string

  if (isSameParentPath) {
    const sourceIndex = getCollectionIndexFromPath(sourcePath)
    const destinationIndex = getCollectionIndexFromPath(destinationPath)

    if (
      (sourceIndex || sourceIndex === 0) &&
      (destinationIndex || destinationIndex === 0) &&
      sourceIndex < destinationIndex
    ) {
      newDestinationPath = destinationParentPath
        ? `${destinationParentPath}/${destinationIndex - 1}`
        : `${destinationIndex - 1}`
    } else {
      newDestinationPath = destinationPath
    }
  } else {
    newDestinationPath = destinationPath
  }

  const destinationFolder = navigateToFolderWithIndexPath(
    collectionStore.value.state,
    newDestinationPath.split("/").map((index) => parseInt(index))
  )

  const newSourcePath = destinationFolder
    ? `${newDestinationPath}/${destinationFolder?.folders.length - 1}`
    : undefined

  return { newSourcePath, newDestinationPath }
}

/**
 * Shared move/reorder requests implementation
 */
export const createMoveOrReorderRequests = (context: SyncContext) => {
  return async (
    requestIndex: number,
    path: string,
    destinationPath: string,
    nextRequestIndex?: number
  ) => {
    const sourceCollectionBackendID = navigateToFolderWithIndexPath(
      context.collectionStore.value.state,
      path.split("/").map((index) => parseInt(index))
    )?.id

    const destinationCollection = navigateToFolderWithIndexPath(
      context.collectionStore.value.state,
      destinationPath.split("/").map((index) => parseInt(index))
    )

    const destinationCollectionBackendID = destinationCollection?.id

    let requestBackendID: string | undefined
    let nextRequestBackendID: string | undefined

    if (nextRequestIndex !== undefined) {
      // Reordering
      const [newRequestIndex, newDestinationIndex] = getIndexesAfterReorder(
        requestIndex,
        nextRequestIndex
      )
      requestBackendID =
        destinationCollection?.requests[newRequestIndex]?.id ?? undefined
      nextRequestBackendID =
        destinationCollection?.requests[newDestinationIndex]?.id ?? undefined
    } else {
      // Moving
      const requests = destinationCollection?.requests
      requestBackendID =
        requests && requests.length > 0
          ? requests[requests.length - 1]?.id
          : undefined
    }

    if (
      sourceCollectionBackendID &&
      destinationCollectionBackendID &&
      requestBackendID
    ) {
      await context.api.moveUserRequest(
        sourceCollectionBackendID,
        destinationCollectionBackendID,
        requestBackendID,
        nextRequestBackendID
      )
    }
  }
}
