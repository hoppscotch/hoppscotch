import {
  graphqlCollectionStore,
  navigateToFolderWithIndexPath,
  restCollectionStore,
} from "@hoppscotch/common/newstore/collections"
import { createMapper } from "../../lib/sync/mapper"
import {
  restCollectionsMapper,
  collectionReorderOrMovingOperations,
  restRequestsMapper,
} from "./collections.sync"
import { gqlCollectionsMapper, gqlRequestsMapper } from "./gqlCollections.sync"

function reorderItems(array: unknown[], from: number, to: number) {
  const item = array.splice(from, 1)[0]
  if (from < to) {
    array.splice(to - 1, 0, item)
  } else {
    array.splice(to, 0, item)
  }
}

type RequestType = "REST" | "GQL"

export function moveCollectionInMapper(
  folderPath: string,
  destinationPath?: string,
  collectionType: RequestType = "REST"
) {
  const indexes = folderPath.split("/")
  indexes.pop()
  const collectionPath = indexes.join("/")

  const { collectionsMapper, requestsMapper, collectionStore } =
    getMappersAndStoreByType(collectionType)

  // Store the backend id of the folder to move for adding it to the destinationPath
  const collectionToMoveBackendID =
    collectionsMapper.getBackendIDByLocalID(folderPath)

  // Remove the request from its current position
  collectionsMapper.removeEntry(undefined, folderPath)

  // We are assuming moveRequestInMapper is called after the item is moved in the store,
  // so we'll fetch the index of the last added item + 1 to add to the mapper
  // but in the case of the same parent, the destinationPath will change
  // eg:
  // 0. Collection 0
  // 1. Collection 1
  // in the above example, if we move Collection 0 to Collection 1 ( folderPath: 0, destinationPath: 1 ),
  // the effective index of Collection 1, when using navigateToFolderWithIndexPath will be 0
  // so we check if the moving is between same parent folders / collections and adds a workaround for this
  const isSameParentPath =
    getParentPathFromPath(folderPath) == getParentPathFromPath(destinationPath)

  let changedDestinationPath: string | undefined

  if (isSameParentPath) {
    const lastFolderPathIndex = folderPath.split("/").pop()
    const folderIndex = lastFolderPathIndex && parseInt(lastFolderPathIndex)

    const lastDestinationPathIndex =
      destinationPath && destinationPath.split("/").pop()
    const destinationIndex =
      destinationPath &&
      lastDestinationPathIndex &&
      parseInt(lastDestinationPathIndex)

    if (
      (folderIndex == 0 || folderIndex) &&
      (destinationIndex == 0 || destinationIndex) &&
      folderIndex < destinationIndex
    ) {
      const destinationParentPath = getParentPathFromPath(destinationPath)
      changedDestinationPath = destinationParentPath
        ? `${destinationParentPath}/${destinationIndex - 1}`
        : `${destinationIndex - 1}`
    }
  }

  const destinationFolder =
    changedDestinationPath &&
    navigateToFolderWithIndexPath(
      collectionStore.value.state,
      changedDestinationPath.split("/").map((pathIndex) => parseInt(pathIndex))
    )

  const destinationCollectionID =
    destinationPath && collectionsMapper.getBackendIDByLocalID(destinationPath)

  if (destinationFolder && collectionToMoveBackendID) {
    const destinationIndex = destinationFolder.folders.length

    const newPath = `${destinationPath}/${destinationIndex}`
    collectionsMapper.addEntry(newPath, collectionToMoveBackendID)

    changeParentForAllChildrenFromMapper(folderPath, newPath, collectionType)

    collectionToMoveBackendID &&
      collectionReorderOrMovingOperations.push({
        sourceCollectionID: collectionToMoveBackendID,
        destinationCollectionID,
        reorderOperation: {
          fromPath: folderPath,
          toPath: `${changedDestinationPath}/${destinationIndex}`,
        },
      })
  }

  // destinationPath won't be there, when moving to the root
  if (!destinationPath && collectionToMoveBackendID) {
    const destinationIndex = collectionStore.value.state.length
    const newPath = `${destinationIndex}`

    collectionsMapper.addEntry(newPath, collectionToMoveBackendID)

    changeParentForAllChildrenFromMapper(folderPath, newPath, collectionType)
  }

  reorderIndexesAfterEntryRemoval(
    collectionPath,
    collectionsMapper,
    collectionType
  )
  reorderIndexesAfterEntryRemoval(
    collectionPath,
    requestsMapper,
    collectionType
  )
}

export function moveRequestInMapper(
  requestIndex: number,
  path: string,
  destinationPath: string,
  requestType: RequestType
) {
  const { collectionStore, requestsMapper } =
    getMappersAndStoreByType(requestType)

  // Store the backend id of the request to move for adding it to the destinationPath
  const requestToMoveBackendID = requestsMapper.getBackendIDByLocalID(
    `${path}/${requestIndex}`
  )

  // Remove the request from its current position
  requestsMapper.removeEntry(undefined, `${path}/${requestIndex}`)
  reorderIndexesAfterEntryRemoval(path, requestsMapper, requestType)

  // We are assuming moveRequestInMapper is called after the item is moved in the store,
  // so we'll fetch the index of the last added item + 1 to add to the mapper
  const destinationFolder = navigateToFolderWithIndexPath(
    collectionStore.value.state,
    destinationPath.split("/").map((pathIndex) => parseInt(pathIndex))
  )

  if (destinationFolder && requestToMoveBackendID) {
    const destinationIndex = destinationFolder.requests.length

    requestsMapper.addEntry(
      `${destinationPath}/${destinationIndex}`,
      requestToMoveBackendID
    )
  }
}

// we allow reordering in the same parent collection right now
export function reorderRequestsMapper(
  requestIndex: number,
  path: string,
  nextRequestIndex: number,
  requestType: RequestType
) {
  const { requestsMapper } = getMappersAndStoreByType(requestType)

  const directChildren = getDirectChildrenEntriesFromMapper(
    path,
    requestsMapper
  )

  reorderItems(directChildren, requestIndex, nextRequestIndex)

  directChildren.forEach((item, index) => {
    item[1] && requestsMapper.addEntry(`${path}/${index}`, item[1])
  })
}
// we allow reordering in the same parent collection right now

export function reorderCollectionsInMapper(
  collectionPath: string,
  destinationCollectionPath: string,
  requestType: RequestType
) {
  const { requestsMapper, collectionsMapper } =
    getMappersAndStoreByType(requestType)

  const indexes = collectionPath.split("/")
  indexes.pop()
  const parentCollectionPath = indexes.join("/")

  const directChildren = getDirectChildrenEntriesFromMapper(
    parentCollectionPath,
    collectionsMapper
  )

  const collectionIndex = collectionPath.split("/").pop()
  const destinationIndex = destinationCollectionPath.split("/").pop()

  collectionIndex &&
    destinationIndex &&
    reorderItems(
      directChildren,
      parentCollectionPath
        ? parseInt(collectionIndex)
        : parseInt(collectionPath),
      parentCollectionPath
        ? parseInt(destinationIndex)
        : parseInt(destinationCollectionPath)
    )

  const previousCollectionEntries: Record<
    string,
    [string, string | undefined][]
  > = {}

  const previousRequestEntries: Record<string, [string, string | undefined][]> =
    {}

  directChildren.forEach(([path, backendID], index) => {
    const newPath = parentCollectionPath
      ? `${parentCollectionPath}/${index}`
      : `${index}`

    const indexes = path.split("/")
    const childIndex = indexes.pop()

    if (childIndex && index != parseInt(childIndex)) {
      backendID && collectionsMapper.addEntry(newPath, backendID)

      const existingCollectionsOnNewPath = getChildrenEntriesFromMapper(
        newPath,
        collectionsMapper
      )

      const existingRequestsOnNewPath = getChildrenEntriesFromMapper(
        newPath,
        requestsMapper
      )

      previousCollectionEntries[newPath] = existingCollectionsOnNewPath
      previousRequestEntries[newPath] = existingRequestsOnNewPath

      removeAllChildCollectionsFromMapper(newPath, requestType)
      removeAllChildRequestsFromMapper(newPath, requestType)

      if (path in previousCollectionEntries && path in previousRequestEntries) {
        previousCollectionEntries[path].forEach(([previousPath, backendID]) => {
          const pattern = new RegExp(`^(${path})\/`)

          const updatedPath = previousPath.replace(pattern, `${newPath}/`)

          backendID && collectionsMapper.addEntry(updatedPath, backendID)
        })

        previousRequestEntries[path].forEach(([previousPath, backendID]) => {
          const pattern = new RegExp(`^(${path})\/`)

          const updatedPath = previousPath.replace(pattern, `${newPath}/`)

          backendID && requestsMapper.addEntry(updatedPath, backendID)
        })
      } else {
        changeParentForAllChildrenFromMapper(path, newPath, requestType)
      }
    }
  })
}

export function removeAndReorderEntries(
  localIndex: string,
  collectionType: RequestType
) {
  const { collectionsMapper, requestsMapper } =
    getMappersAndStoreByType(collectionType)

  // get the collectionPath from the localIndex
  const indexes = localIndex.split("/")
  indexes.pop()
  const collectionPath = indexes.join("/")

  collectionsMapper.removeEntry(undefined, localIndex)

  removeAllChildCollectionsFromMapper(localIndex, collectionType)
  removeAllChildRequestsFromMapper(localIndex, collectionType)

  reorderIndexesAfterEntryRemoval(
    collectionPath,
    collectionsMapper,
    collectionType
  )
  reorderIndexesAfterEntryRemoval(
    collectionPath,
    requestsMapper,
    collectionType
  )
}

export function removeAllChildRequestsFromMapper(
  collectionPath: string,
  requestType: RequestType
) {
  const { requestsMapper } = getMappersAndStoreByType(requestType)

  const childRequestMapperEntries = getChildrenEntriesFromMapper(
    collectionPath,
    requestsMapper
  )

  childRequestMapperEntries.forEach(([path]) => {
    typeof path == "string" && requestsMapper.removeEntry(undefined, path)
  })
}

export function removeAllChildCollectionsFromMapper(
  collectionPath: string,
  collectionType: RequestType
) {
  const { collectionsMapper } = getMappersAndStoreByType(collectionType)

  const childCollectionMapperEntries = getChildrenEntriesFromMapper(
    collectionPath,
    collectionsMapper
  )

  childCollectionMapperEntries.forEach(([path]) => {
    typeof path == "string" && collectionsMapper.removeEntry(undefined, path)
  })
}

export function changeParentForAllChildrenFromMapper(
  currentParentPath: string,
  newParentPath: string,
  collectionType: RequestType
) {
  const { collectionsMapper, requestsMapper } =
    getMappersAndStoreByType(collectionType)

  const childCollectionsMapperEntries = getChildrenEntriesFromMapper(
    currentParentPath,
    collectionsMapper
  )

  const childRequestsMapperEntries = getChildrenEntriesFromMapper(
    currentParentPath,
    requestsMapper
  )

  const pattern = new RegExp(`^(${currentParentPath})`)

  childCollectionsMapperEntries.forEach(([path, backendID]) => {
    const newPath =
      typeof path == "string" && path.replace(pattern, newParentPath)

    if (newPath && typeof backendID == "string") {
      collectionsMapper.removeEntry(undefined, path)
      collectionsMapper.addEntry(newPath, backendID)
    }
  })

  childRequestsMapperEntries.forEach(([path, backendID]) => {
    const newPath =
      typeof path == "string" && path.replace(pattern, newParentPath)

    if (newPath && typeof backendID == "string") {
      requestsMapper.removeEntry(undefined, path)
      requestsMapper.addEntry(newPath, backendID)
    }
  })
}

export function getChildrenEntriesFromMapper(
  path: string,
  mapper: ReturnType<typeof createMapper<string, string>>
) {
  let mapperEntries = Array.from(mapper.getValue().entries())

  // if there are no path( eg: "" ), all the entries are children, so return the entire mapperEntries without filtering
  if (!path) return mapperEntries

  mapperEntries = mapperEntries.filter((entry) => {
    const pattern = new RegExp(`^${path}\/(\\w+)\/?.*$`)

    return !!(typeof entry[0] == "string" && entry[0].match(pattern))
  })

  return mapperEntries
}

export function getDirectChildrenEntriesFromMapper(
  path: string,
  mapper: ReturnType<typeof createMapper<string, string>>
) {
  let mapperEntries = Array.from(mapper.getValue().entries())

  mapperEntries = mapperEntries.filter((entry) => {
    const pattern = new RegExp(path ? `^${path}\/\\d+$` : `^\\d+$`)

    return !!(typeof entry[0] == "string" && entry[0].match(pattern))
  })

  return mapperEntries
}

export function reorderIndexesAfterEntryRemoval(
  pathToReorder: string,
  mapper: ReturnType<typeof createMapper<string, string>>,
  requestType: RequestType
) {
  const directChildren = getDirectChildrenEntriesFromMapper(
    pathToReorder,
    mapper
  )

  directChildren.forEach(([path, backendID], index) => {
    const indexes = path.split("/").map((index) => parseInt(index))
    const childIndex = indexes.pop()
    const collectionPath = indexes.join("/")

    if (childIndex != index && backendID) {
      const newPath = collectionPath ? `${collectionPath}/${index}` : `${index}`

      mapper.removeEntry(undefined, path)
      mapper.addEntry(newPath, backendID)
      changeParentForAllChildrenFromMapper(path, newPath, requestType)
    }
  })
}

function getParentPathFromPath(path: string | undefined) {
  const indexes = path ? path.split("/") : []
  indexes.pop()

  return indexes.join("/")
}

export function getMappersAndStoreByType(type: "GQL" | "REST") {
  const isGQL = type == "GQL"

  const collectionsMapper = isGQL ? gqlCollectionsMapper : restCollectionsMapper

  const requestsMapper = isGQL ? gqlRequestsMapper : restRequestsMapper

  const collectionStore = isGQL ? graphqlCollectionStore : restCollectionStore

  return { collectionsMapper, requestsMapper, collectionStore }
}
