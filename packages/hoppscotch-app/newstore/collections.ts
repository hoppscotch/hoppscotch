import { pluck } from "rxjs/operators"
import {
  HoppGQLRequest,
  translateToGQLRequest,
  HoppRESTRequest,
  translateToNewRequest,
} from "@hoppscotch/data"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { getRESTSaveContext, setRESTSaveContext } from "./RESTSession"

export interface Collection<T extends HoppRESTRequest | HoppGQLRequest> {
  v: number
  name: string
  folders: Collection<T>[]
  requests: T[]

  id?: string // For Firestore ID
}

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

export function makeCollection<T extends HoppRESTRequest | HoppGQLRequest>(
  x: Omit<Collection<T>, "v">
): Collection<T> {
  return {
    v: 1,
    ...x,
  }
}

export function translateToNewRESTCollection(
  x: any
): Collection<HoppRESTRequest> {
  if (x.v && x.v === 1) return x

  // Legacy
  const name = x.name ?? "Untitled"
  const folders = (x.folders ?? []).map(translateToNewRESTCollection)
  const requests = (x.requests ?? []).map(translateToNewRequest)

  const obj = makeCollection<HoppRESTRequest>({
    name,
    folders,
    requests,
  })

  if (x.id) obj.id = x.id

  return obj
}

export function translateToNewGQLCollection(
  x: any
): Collection<HoppGQLRequest> {
  if (x.v && x.v === 1) return x

  // Legacy
  const name = x.name ?? "Untitled"
  const folders = (x.folders ?? []).map(translateToNewGQLCollection)
  const requests = (x.requests ?? []).map(translateToGQLRequest)

  const obj = makeCollection<HoppGQLRequest>({
    name,
    folders,
    requests,
  })

  if (x.id) obj.id = x.id

  return obj
}

type RESTCollectionStoreType = typeof defaultRESTCollectionState
type GraphqlCollectionStoreType = typeof defaultGraphqlCollectionState

function navigateToFolderWithIndexPath(
  collections: Collection<HoppRESTRequest | HoppGQLRequest>[],
  indexPaths: number[]
) {
  if (indexPaths.length === 0) return null

  let target = collections[indexPaths.shift() as number]

  while (indexPaths.length > 0)
    target = target.folders[indexPaths.shift() as number]

  return target !== undefined ? target : null
}

const restCollectionDispatchers = defineDispatchers({
  setCollections(
    _: RESTCollectionStoreType,
    { entries }: { entries: Collection<HoppRESTRequest>[] }
  ) {
    return {
      state: entries,
    }
  },

  appendCollections(
    { state }: RESTCollectionStoreType,
    { entries }: { entries: Collection<HoppRESTRequest>[] }
  ) {
    return {
      state: [...state, ...entries],
    }
  },

  addCollection(
    { state }: RESTCollectionStoreType,
    { collection }: { collection: Collection<any> }
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
      collection,
    }: { collectionIndex: number; collection: Collection<any> }
  ) {
    return {
      state: state.map((col, index) =>
        index === collectionIndex ? collection : col
      ),
    }
  },

  addFolder(
    { state }: RESTCollectionStoreType,
    { name, path }: { name: string; path: string }
  ) {
    const newFolder: Collection<HoppRESTRequest> = makeCollection({
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
    { path, folder }: { path: string; folder: string }
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

    Object.assign(target, folder)

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

    // If the save context is set and is set to the same source, we invalidate it
    const saveCtx = getRESTSaveContext()
    if (
      saveCtx?.originLocation === "user-collection" &&
      saveCtx.folderPath === path &&
      saveCtx.requestIndex === requestIndex
    ) {
      setRESTSaveContext(null)
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

const gqlCollectionDispatchers = defineDispatchers({
  setCollections(
    _: GraphqlCollectionStoreType,
    { entries }: { entries: Collection<any>[] }
  ) {
    return {
      state: entries,
    }
  },

  appendCollections(
    { state }: GraphqlCollectionStoreType,
    { entries }: { entries: Collection<any>[] }
  ) {
    return {
      state: [...state, ...entries],
    }
  },

  addCollection(
    { state }: GraphqlCollectionStoreType,
    { collection }: { collection: Collection<any> }
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
    }: { collectionIndex: number; collection: Collection<any> }
  ) {
    return {
      state: state.map((col, index) =>
        index === collectionIndex ? collection : col
      ),
    }
  },

  addFolder(
    { state }: GraphqlCollectionStoreType,
    { name, path }: { name: string; path: string }
  ) {
    const newFolder: Collection<HoppGQLRequest> = makeCollection({
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
    { path, folder }: { path: string; folder: string }
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

    Object.assign(target, folder)

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

    // If the save context is set and is set to the same source, we invalidate it
    const saveCtx = getRESTSaveContext()
    if (
      saveCtx?.originLocation === "user-collection" &&
      saveCtx.folderPath === path &&
      saveCtx.requestIndex === requestIndex
    ) {
      setRESTSaveContext(null)
    }

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

export function setRESTCollections(entries: Collection<HoppRESTRequest>[]) {
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

export function appendRESTCollections(entries: Collection<HoppRESTRequest>[]) {
  restCollectionStore.dispatch({
    dispatcher: "appendCollections",
    payload: {
      entries,
    },
  })
}

export function addRESTCollection(collection: Collection<HoppRESTRequest>) {
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

export function editRESTCollection(
  collectionIndex: number,
  collection: Collection<HoppRESTRequest>
) {
  restCollectionStore.dispatch({
    dispatcher: "editCollection",
    payload: {
      collectionIndex,
      collection,
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
  folder: Collection<HoppRESTRequest>
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

export function setGraphqlCollections(entries: Collection<HoppGQLRequest>[]) {
  graphqlCollectionStore.dispatch({
    dispatcher: "setCollections",
    payload: {
      entries,
    },
  })
}

export function appendGraphqlCollections(
  entries: Collection<HoppGQLRequest>[]
) {
  graphqlCollectionStore.dispatch({
    dispatcher: "appendCollections",
    payload: {
      entries,
    },
  })
}

export function addGraphqlCollection(collection: Collection<HoppGQLRequest>) {
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
  collection: Collection<HoppGQLRequest>
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
  folder: Collection<HoppGQLRequest>
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
