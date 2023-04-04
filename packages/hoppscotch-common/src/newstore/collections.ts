import { pluck } from "rxjs/operators"
import {
  HoppGQLRequest,
  HoppRESTRequest,
  HoppCollection,
  makeCollection,
} from "@hoppscotch/data"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { cloneDeep } from "lodash-es"
import { getTabRefWithSaveContext } from "~/helpers/rest/tab"
import { resolveSaveContextOnRequestReorder } from "~/helpers/collection/request"

const defaultRESTCollectionState = {
  state: [
    makeCollection<HoppRESTRequest>({
      name: "My Collection",
      folders: [],
      requests: [],
    }),
  ],
}

const defaultGraphqlCollectionState = {
  state: [
    makeCollection<HoppGQLRequest>({
      name: "My GraphQL Collection",
      folders: [],
      requests: [],
    }),
  ],
}

type RESTCollectionStoreType = typeof defaultRESTCollectionState
type GraphqlCollectionStoreType = typeof defaultGraphqlCollectionState

export function navigateToFolderWithIndexPath(
  collections: HoppCollection<HoppRESTRequest | HoppGQLRequest>[],
  indexPaths: number[]
) {
  if (indexPaths.length === 0) return null

  let target = collections[indexPaths.shift() as number]

  while (indexPaths.length > 0)
    target = target.folders[indexPaths.shift() as number]

  return target !== undefined ? target : null
}

function reorderItems(array: unknown[], from: number, to: number) {
  const item = array.splice(from, 1)[0]
  if (from < to) {
    array.splice(to - 1, 0, item)
  } else {
    array.splice(to, 0, item)
  }
}

const restCollectionDispatchers = defineDispatchers({
  setCollections(
    _: RESTCollectionStoreType,
    { entries }: { entries: HoppCollection<HoppRESTRequest>[] }
  ) {
    return {
      state: entries,
    }
  },

  appendCollections(
    { state }: RESTCollectionStoreType,
    { entries }: { entries: HoppCollection<HoppRESTRequest>[] }
  ) {
    return {
      state: [...state, ...entries],
    }
  },

  addCollection(
    { state }: RESTCollectionStoreType,
    { collection }: { collection: HoppCollection<any> }
  ) {
    return {
      state: [...state, collection],
    }
  },

  removeCollection(
    { state }: RESTCollectionStoreType,
    { collectionIndex }: { collectionIndex: number }
  ) {
    return {
      state: (state as any).filter(
        (_: any, i: number) => i !== collectionIndex
      ),
    }
  },

  editCollection(
    { state }: RESTCollectionStoreType,
    {
      collectionIndex,
      partialCollection,
    }: {
      collectionIndex: number
      partialCollection: Partial<HoppCollection<any>>
    }
  ) {
    return {
      state: state.map((col, index) =>
        index === collectionIndex
          ? { ...col, ...cloneDeep(partialCollection) }
          : col
      ),
    }
  },

  addFolder(
    { state }: RESTCollectionStoreType,
    { name, path }: { name: string; path: string }
  ) {
    const newFolder: HoppCollection<HoppRESTRequest> = makeCollection({
      name,
      folders: [],
      requests: [],
    })

    const newState = state
    const indexPaths = path.split("/").map((x) => parseInt(x))

    const target = navigateToFolderWithIndexPath(newState, indexPaths)

    if (target === null) {
      console.log(`Could not parse path '${path}'. Ignoring add folder request`)
      return {}
    }

    target.folders.push(newFolder)

    return {
      state: newState,
    }
  },

  editFolder(
    { state }: RESTCollectionStoreType,
    {
      path,
      folder,
    }: {
      path: string
      folder: Partial<HoppCollection<HoppRESTRequest>>
    }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))

    const target = navigateToFolderWithIndexPath(newState, indexPaths)

    if (target === null) {
      console.log(
        `Could not parse path '${path}'. Ignoring edit folder request`
      )
      return {}
    }

    Object.assign(target, {
      ...target,
      ...cloneDeep(folder),
    })

    return {
      state: newState,
    }
  },

  removeFolder({ state }: RESTCollectionStoreType, { path }: { path: string }) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))
    if (indexPaths.length === 0) {
      console.log(
        "Given path too short. If this is a collection, use removeCollection dispatcher instead. Skipping request."
      )
      return {}
    }
    // We get the index path to the folder itself,
    // we have to find the folder containing the target folder,
    // so we pop the last path index
    const folderIndex = indexPaths.pop() as number

    const containingFolder = navigateToFolderWithIndexPath(newState, indexPaths)

    if (containingFolder === null) {
      console.log(
        `Could not resolve path '${path}'. Skipping removeFolder dispatch.`
      )
      return {}
    }

    containingFolder.folders.splice(folderIndex, 1)

    return {
      state: newState,
    }
  },

  moveFolder(
    { state }: RESTCollectionStoreType,
    { path, destinationPath }: { path: string; destinationPath: string | null }
  ) {
    const newState = state

    // Move the folder to the root
    if (destinationPath === null) {
      const indexPaths = path.split("/").map((x) => parseInt(x))

      if (indexPaths.length === 0) {
        console.log("Given path too short. Skipping request.")
        return {}
      }

      const folderIndex = indexPaths.pop() as number

      const containingFolder = navigateToFolderWithIndexPath(
        newState,
        indexPaths
      )
      if (containingFolder === null) {
        console.error(
          `The folder to move is already in the root. Skipping request to move folder.`
        )
        return {}
      }

      const theFolder = containingFolder.folders.splice(folderIndex, 1)
      newState.push(theFolder[0] as HoppCollection<HoppRESTRequest>)

      return {
        state: newState,
      }
    }

    const indexPaths = path.split("/").map((x) => parseInt(x))

    const destinationIndexPaths = destinationPath
      .split("/")
      .map((x) => parseInt(x))

    if (indexPaths.length === 0 || destinationIndexPaths.length === 0) {
      console.error(
        `Given path is too short. Skipping request to move folder '${path}' to destination '${destinationPath}'.`
      )
      return {}
    }

    const target = navigateToFolderWithIndexPath(
      newState,
      destinationIndexPaths
    )
    if (target === null) {
      console.error(
        `Could not resolve destination path '${destinationPath}'. Skipping moveFolder dispatch.`
      )
      return {}
    }

    const folderIndex = indexPaths.pop() as number

    const containingFolder = navigateToFolderWithIndexPath(newState, indexPaths)
    // We are moving a folder from the root
    if (containingFolder === null) {
      const theFolder = newState.splice(folderIndex, 1)

      target.folders.push(theFolder[0])
    } else {
      const theFolder = containingFolder.folders.splice(folderIndex, 1)

      target.folders.push(theFolder[0])
    }

    return { state: newState }
  },

  updateCollectionOrder(
    { state }: RESTCollectionStoreType,
    {
      collectionIndex,
      destinationCollectionIndex,
    }: {
      collectionIndex: string
      destinationCollectionIndex: string | null
    }
  ) {
    const newState = state

    const indexPaths = collectionIndex.split("/").map((x) => parseInt(x))

    if (indexPaths.length === 0) {
      console.log("Given path too short. Skipping request.")
      return {}
    }

    // Reordering the collection to the last position
    if (destinationCollectionIndex === null) {
      const folderIndex = indexPaths.pop() as number

      const containingFolder = navigateToFolderWithIndexPath(
        newState,
        indexPaths
      )

      if (containingFolder === null) {
        newState.push(newState.splice(folderIndex, 1)[0])
        return {
          state: newState,
        }
      }

      // Pushing the folder to the end of the array (last position)
      containingFolder.folders.push(
        containingFolder.folders.splice(folderIndex, 1)[0]
      )

      return {
        state: newState,
      }
    }

    const destinationIndexPaths = destinationCollectionIndex
      .split("/")
      .map((x) => parseInt(x))

    if (destinationIndexPaths.length === 0) {
      console.log("Given path too short. Skipping request.")
      return {}
    }

    const folderIndex = indexPaths.pop() as number
    const destinationFolderIndex = destinationIndexPaths.pop() as number

    const containingFolder = navigateToFolderWithIndexPath(
      newState,
      destinationIndexPaths
    )

    if (containingFolder === null) {
      reorderItems(newState, folderIndex, destinationFolderIndex)

      return {
        state: newState,
      }
    }

    reorderItems(containingFolder.folders, folderIndex, destinationFolderIndex)

    return {
      state: newState,
    }
  },

  editRequest(
    { state }: RESTCollectionStoreType,
    {
      path,
      requestIndex,
      requestNew,
    }: { path: string; requestIndex: number; requestNew: any }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))

    const targetLocation = navigateToFolderWithIndexPath(newState, indexPaths)

    if (targetLocation === null) {
      console.log(
        `Could not resolve path '${path}'. Ignoring editRequest dispatch.`
      )
      return {}
    }

    targetLocation.requests = targetLocation.requests.map((req, index) =>
      index !== requestIndex ? req : requestNew
    )

    return {
      state: newState,
    }
  },

  saveRequestAs(
    { state }: RESTCollectionStoreType,
    { path, request }: { path: string; request: any }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))

    const targetLocation = navigateToFolderWithIndexPath(newState, indexPaths)

    if (targetLocation === null) {
      console.log(
        `Could not resolve path '${path}'. Ignoring saveRequestAs dispatch.`
      )
      return {}
    }

    targetLocation.requests.push(request)

    return {
      state: newState,
    }
  },

  removeRequest(
    { state }: RESTCollectionStoreType,
    { path, requestIndex }: { path: string; requestIndex: number }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))

    const targetLocation = navigateToFolderWithIndexPath(newState, indexPaths)

    if (targetLocation === null) {
      console.log(
        `Could not resolve path '${path}'. Ignoring removeRequest dispatch.`
      )
      return {}
    }

    targetLocation.requests.splice(requestIndex, 1)

    // Deal with situations where a tab with the given thing is deleted
    // We are just going to dissociate the save context of the tab and mark it dirty
    const tab = getTabRefWithSaveContext({
      originLocation: "user-collection",
      folderPath: path,
      requestIndex: requestIndex,
    })

    if (tab) {
      tab.value.document.saveContext = undefined
      tab.value.document.isDirty = true
    }

    return {
      state: newState,
    }
  },

  moveRequest(
    { state }: RESTCollectionStoreType,
    {
      path,
      requestIndex,
      destinationPath,
    }: { path: string; requestIndex: number; destinationPath: string }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))

    if (indexPaths.length === 0) {
      console.log("Given path too short. Skipping request.")
      return {}
    }

    const targetLocation = navigateToFolderWithIndexPath(newState, indexPaths)

    if (targetLocation === null) {
      console.log(
        `Could not resolve source path '${path}'. Skipping moveRequest dispatch.`
      )
      return {}
    }

    const req = targetLocation.requests[requestIndex]

    const destIndexPaths = destinationPath.split("/").map((x) => parseInt(x))

    const destLocation = navigateToFolderWithIndexPath(newState, destIndexPaths)

    if (destLocation === null) {
      console.log(
        `Could not resolve destination path '${destinationPath}'. Skipping moveRequest dispatch.`
      )
      return {}
    }

    destLocation.requests.push(req)
    targetLocation.requests.splice(requestIndex, 1)

    const possibleTab = getTabRefWithSaveContext({
      originLocation: "user-collection",
      folderPath: path,
      requestIndex,
    })

    if (possibleTab) {
      possibleTab.value.document.saveContext = {
        originLocation: "user-collection",
        folderPath: destinationPath,
        requestIndex: destLocation.requests.length - 1,
      }
    }

    return {
      state: newState,
    }
  },

  updateRequestOrder(
    { state }: RESTCollectionStoreType,
    {
      requestIndex,
      destinationRequestIndex,
      destinationCollectionPath,
    }: {
      requestIndex: number
      destinationRequestIndex: number | null
      destinationCollectionPath: string
    }
  ) {
    const newState = state

    const indexPaths = destinationCollectionPath
      .split("/")
      .map((x) => parseInt(x))

    if (indexPaths.length === 0) {
      console.log("Given path too short. Skipping request.")
      return {}
    }

    const targetLocation = navigateToFolderWithIndexPath(newState, indexPaths)

    if (targetLocation === null) {
      console.log(
        `Could not resolve path '${destinationCollectionPath}'. Ignoring reorderRequest dispatch.`
      )
      return {}
    }

    // if the destination is null, we are moving to the end of the list
    if (destinationRequestIndex === null) {
      // move to the end of the list
      targetLocation.requests.push(
        targetLocation.requests.splice(requestIndex, 1)[0]
      )

      resolveSaveContextOnRequestReorder({
        lastIndex: requestIndex,
        newIndex: targetLocation.requests.length,
        folderPath: destinationCollectionPath,
      })

      return {
        state: newState,
      }
    }

    reorderItems(targetLocation.requests, requestIndex, destinationRequestIndex)

    resolveSaveContextOnRequestReorder({
      lastIndex: requestIndex,
      newIndex: destinationRequestIndex,
      folderPath: destinationCollectionPath,
    })

    return {
      state: newState,
    }
  },
})

const gqlCollectionDispatchers = defineDispatchers({
  setCollections(
    _: GraphqlCollectionStoreType,
    { entries }: { entries: HoppCollection<any>[] }
  ) {
    return {
      state: entries,
    }
  },

  appendCollections(
    { state }: GraphqlCollectionStoreType,
    { entries }: { entries: HoppCollection<any>[] }
  ) {
    return {
      state: [...state, ...entries],
    }
  },

  addCollection(
    { state }: GraphqlCollectionStoreType,
    { collection }: { collection: HoppCollection<any> }
  ) {
    return {
      state: [...state, collection],
    }
  },

  removeCollection(
    { state }: GraphqlCollectionStoreType,
    { collectionIndex }: { collectionIndex: number }
  ) {
    return {
      state: (state as any).filter(
        (_: any, i: number) => i !== collectionIndex
      ),
    }
  },

  editCollection(
    { state }: GraphqlCollectionStoreType,
    {
      collectionIndex,
      collection,
    }: { collectionIndex: number; collection: Partial<HoppCollection<any>> }
  ) {
    return {
      state: state.map((col, index) =>
        index === collectionIndex ? { ...col, ...cloneDeep(collection) } : col
      ),
    }
  },

  addFolder(
    { state }: GraphqlCollectionStoreType,
    { name, path }: { name: string; path: string }
  ) {
    const newFolder: HoppCollection<HoppGQLRequest> = makeCollection({
      name,
      folders: [],
      requests: [],
    })

    const newState = state
    const indexPaths = path.split("/").map((x) => parseInt(x))

    const target = navigateToFolderWithIndexPath(newState, indexPaths)

    if (target === null) {
      console.log(`Could not parse path '${path}'. Ignoring add folder request`)
      return {}
    }

    target.folders.push(newFolder)

    return {
      state: newState,
    }
  },

  editFolder(
    { state }: GraphqlCollectionStoreType,
    {
      path,
      folder,
    }: { path: string; folder: Partial<HoppCollection<HoppGQLRequest>> }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))

    const target = navigateToFolderWithIndexPath(newState, indexPaths)

    if (target === null) {
      console.log(
        `Could not parse path '${path}'. Ignoring edit folder request`
      )
      return {}
    }

    Object.assign(target, {
      ...target,
      ...cloneDeep(folder),
    })

    return {
      state: newState,
    }
  },

  removeFolder(
    { state }: GraphqlCollectionStoreType,
    { path }: { path: string }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))
    if (indexPaths.length === 0) {
      console.log(
        "Given path too short. If this is a collection, use removeCollection dispatcher instead. Skipping request."
      )
      return {}
    }
    // We get the index path to the folder itself,
    // we have to find the folder containing the target folder,
    // so we pop the last path index
    const folderIndex = indexPaths.pop() as number

    const containingFolder = navigateToFolderWithIndexPath(newState, indexPaths)

    if (containingFolder === null) {
      console.log(
        `Could not resolve path '${path}'. Skipping removeFolder dispatch.`
      )
      return {}
    }

    containingFolder.folders.splice(folderIndex, 1)

    return {
      state: newState,
    }
  },

  editRequest(
    { state }: GraphqlCollectionStoreType,
    {
      path,
      requestIndex,
      requestNew,
    }: { path: string; requestIndex: number; requestNew: any }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))

    const targetLocation = navigateToFolderWithIndexPath(newState, indexPaths)

    if (targetLocation === null) {
      console.log(
        `Could not resolve path '${path}'. Ignoring editRequest dispatch.`
      )
      return {}
    }

    targetLocation.requests = targetLocation.requests.map((req, index) =>
      index !== requestIndex ? req : requestNew
    )

    return {
      state: newState,
    }
  },

  saveRequestAs(
    { state }: GraphqlCollectionStoreType,
    { path, request }: { path: string; request: any }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))

    const targetLocation = navigateToFolderWithIndexPath(newState, indexPaths)

    if (targetLocation === null) {
      console.log(
        `Could not resolve path '${path}'. Ignoring saveRequestAs dispatch.`
      )
      return {}
    }

    targetLocation.requests.push(request)

    return {
      state: newState,
    }
  },

  removeRequest(
    { state }: GraphqlCollectionStoreType,
    { path, requestIndex }: { path: string; requestIndex: number }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))

    const targetLocation = navigateToFolderWithIndexPath(newState, indexPaths)

    if (targetLocation === null) {
      console.log(
        `Could not resolve path '${path}'. Ignoring removeRequest dispatch.`
      )
      return {}
    }

    targetLocation.requests.splice(requestIndex, 1)

    return {
      state: newState,
    }
  },

  moveRequest(
    { state }: GraphqlCollectionStoreType,
    {
      path,
      requestIndex,
      destinationPath,
    }: { path: string; requestIndex: number; destinationPath: string }
  ) {
    const newState = state

    const indexPaths = path.split("/").map((x) => parseInt(x))

    const targetLocation = navigateToFolderWithIndexPath(newState, indexPaths)

    if (targetLocation === null) {
      console.log(
        `Could not resolve source path '${path}'. Skipping moveRequest dispatch.`
      )
      return {}
    }

    const req = targetLocation.requests[requestIndex]

    const destIndexPaths = destinationPath.split("/").map((x) => parseInt(x))

    const destLocation = navigateToFolderWithIndexPath(newState, destIndexPaths)

    if (destLocation === null) {
      console.log(
        `Could not resolve destination path '${destinationPath}'. Skipping moveRequest dispatch.`
      )
      return {}
    }

    destLocation.requests.push(req)
    targetLocation.requests.splice(requestIndex, 1)

    return {
      state: newState,
    }
  },
})

export const restCollectionStore = new DispatchingStore(
  defaultRESTCollectionState,
  restCollectionDispatchers
)

export const graphqlCollectionStore = new DispatchingStore(
  defaultGraphqlCollectionState,
  gqlCollectionDispatchers
)

export function setRESTCollections(entries: HoppCollection<HoppRESTRequest>[]) {
  restCollectionStore.dispatch({
    dispatcher: "setCollections",
    payload: {
      entries,
    },
  })
}

export const restCollections$ = restCollectionStore.subject$.pipe(
  pluck("state")
)

export const graphqlCollections$ = graphqlCollectionStore.subject$.pipe(
  pluck("state")
)

export function appendRESTCollections(
  entries: HoppCollection<HoppRESTRequest>[]
) {
  restCollectionStore.dispatch({
    dispatcher: "appendCollections",
    payload: {
      entries,
    },
  })
}

export function addRESTCollection(collection: HoppCollection<HoppRESTRequest>) {
  restCollectionStore.dispatch({
    dispatcher: "addCollection",
    payload: {
      collection,
    },
  })
}

export function removeRESTCollection(collectionIndex: number) {
  restCollectionStore.dispatch({
    dispatcher: "removeCollection",
    payload: {
      collectionIndex,
    },
  })
}

export function getRESTCollection(collectionIndex: number) {
  return restCollectionStore.value.state[collectionIndex]
}

export function editRESTCollection(
  collectionIndex: number,
  partialCollection: Partial<HoppCollection<HoppRESTRequest>>
) {
  restCollectionStore.dispatch({
    dispatcher: "editCollection",
    payload: {
      collectionIndex,
      partialCollection: partialCollection,
    },
  })
}

export function addRESTFolder(name: string, path: string) {
  restCollectionStore.dispatch({
    dispatcher: "addFolder",
    payload: {
      name,
      path,
    },
  })
}

export function editRESTFolder(
  path: string,
  folder: Partial<HoppCollection<HoppRESTRequest>>
) {
  restCollectionStore.dispatch({
    dispatcher: "editFolder",
    payload: {
      path,
      folder,
    },
  })
}

export function removeRESTFolder(path: string) {
  restCollectionStore.dispatch({
    dispatcher: "removeFolder",
    payload: {
      path,
    },
  })
}

export function moveRESTFolder(path: string, destinationPath: string | null) {
  restCollectionStore.dispatch({
    dispatcher: "moveFolder",
    payload: {
      path,
      destinationPath,
    },
  })
}

export function editRESTRequest(
  path: string,
  requestIndex: number,
  requestNew: HoppRESTRequest
) {
  const indexPaths = path.split("/").map((x) => parseInt(x))
  if (
    !navigateToFolderWithIndexPath(restCollectionStore.value.state, indexPaths)
  )
    throw new Error("Path not found")

  restCollectionStore.dispatch({
    dispatcher: "editRequest",
    payload: {
      path,
      requestIndex,
      requestNew,
    },
  })
}

export function saveRESTRequestAs(path: string, request: HoppRESTRequest) {
  // For calculating the insertion request index
  const targetLocation = navigateToFolderWithIndexPath(
    restCollectionStore.value.state,
    path.split("/").map((x) => parseInt(x))
  )

  const insertionIndex = targetLocation!.requests.length

  restCollectionStore.dispatch({
    dispatcher: "saveRequestAs",
    payload: {
      path,
      request,
    },
  })

  return insertionIndex
}

export function removeRESTRequest(path: string, requestIndex: number) {
  restCollectionStore.dispatch({
    dispatcher: "removeRequest",
    payload: {
      path,
      requestIndex,
    },
  })
}

export function moveRESTRequest(
  path: string,
  requestIndex: number,
  destinationPath: string
) {
  restCollectionStore.dispatch({
    dispatcher: "moveRequest",
    payload: {
      path,
      requestIndex,
      destinationPath,
    },
  })
}

export function updateRESTRequestOrder(
  requestIndex: number,
  destinationRequestIndex: number | null,
  destinationCollectionPath: string
) {
  restCollectionStore.dispatch({
    dispatcher: "updateRequestOrder",
    payload: {
      requestIndex,
      destinationRequestIndex,
      destinationCollectionPath,
    },
  })
}

export function updateRESTCollectionOrder(
  collectionIndex: string,
  destinationCollectionIndex: string | null
) {
  restCollectionStore.dispatch({
    dispatcher: "updateCollectionOrder",
    payload: {
      collectionIndex,
      destinationCollectionIndex,
    },
  })
}

export function setGraphqlCollections(
  entries: HoppCollection<HoppGQLRequest>[]
) {
  graphqlCollectionStore.dispatch({
    dispatcher: "setCollections",
    payload: {
      entries,
    },
  })
}

export function appendGraphqlCollections(
  entries: HoppCollection<HoppGQLRequest>[]
) {
  graphqlCollectionStore.dispatch({
    dispatcher: "appendCollections",
    payload: {
      entries,
    },
  })
}

export function addGraphqlCollection(
  collection: HoppCollection<HoppGQLRequest>
) {
  graphqlCollectionStore.dispatch({
    dispatcher: "addCollection",
    payload: {
      collection,
    },
  })
}

export function removeGraphqlCollection(collectionIndex: number) {
  graphqlCollectionStore.dispatch({
    dispatcher: "removeCollection",
    payload: {
      collectionIndex,
    },
  })
}

export function editGraphqlCollection(
  collectionIndex: number,
  collection: Partial<HoppCollection<HoppGQLRequest>>
) {
  graphqlCollectionStore.dispatch({
    dispatcher: "editCollection",
    payload: {
      collectionIndex,
      collection,
    },
  })
}

export function addGraphqlFolder(name: string, path: string) {
  graphqlCollectionStore.dispatch({
    dispatcher: "addFolder",
    payload: {
      name,
      path,
    },
  })
}

export function editGraphqlFolder(
  path: string,
  folder: Partial<HoppCollection<HoppGQLRequest>>
) {
  graphqlCollectionStore.dispatch({
    dispatcher: "editFolder",
    payload: {
      path,
      folder,
    },
  })
}

export function removeGraphqlFolder(path: string) {
  graphqlCollectionStore.dispatch({
    dispatcher: "removeFolder",
    payload: {
      path,
    },
  })
}

export function editGraphqlRequest(
  path: string,
  requestIndex: number,
  requestNew: HoppGQLRequest
) {
  graphqlCollectionStore.dispatch({
    dispatcher: "editRequest",
    payload: {
      path,
      requestIndex,
      requestNew,
    },
  })
}

export function saveGraphqlRequestAs(path: string, request: HoppGQLRequest) {
  graphqlCollectionStore.dispatch({
    dispatcher: "saveRequestAs",
    payload: {
      path,
      request,
    },
  })
}

export function removeGraphqlRequest(path: string, requestIndex: number) {
  graphqlCollectionStore.dispatch({
    dispatcher: "removeRequest",
    payload: {
      path,
      requestIndex,
    },
  })
}

export function moveGraphqlRequest(
  path: string,
  requestIndex: number,
  destinationPath: string
) {
  graphqlCollectionStore.dispatch({
    dispatcher: "moveRequest",
    payload: {
      path,
      requestIndex,
      destinationPath,
    },
  })
}
