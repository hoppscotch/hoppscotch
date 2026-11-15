import {
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
  isGQLRequest,
} from "@hoppscotch/data"

type Request = HoppRESTRequest | HoppGQLRequest

/**
 * An item together with its position among its unfiltered siblings. Tree
 * paths are built from these positions, so a search result has to keep the
 * position it has in the store rather than the one it has in the results.
 */
export type Indexed<T> = { index: number; data: T }

const withIndex = <T>(items: T[]): Indexed<T>[] =>
  items.map((data, index) => ({ index, data }))

const getMatchers = (filterText: string) => {
  const needle = filterText.toLowerCase()

  const isMatch = (text: string) => text.toLowerCase().includes(needle)

  const isRequestMatch = (request: Request) =>
    isMatch(request.name) ||
    isMatch(isGQLRequest(request) ? request.url : request.endpoint)

  const isFolderMatch = (folder: HoppCollection) =>
    isMatch(folder.name) || folder.requests.some(isRequestMatch)

  return { isMatch, isRequestMatch, isFolderMatch }
}

/**
 * Returns the root collections matching the search text: by name, through one
 * of their requests, or through one of their folders.
 */
export function searchCollections(
  collections: HoppCollection[],
  filterText: string
): Indexed<HoppCollection>[] {
  if (filterText === "") return withIndex(collections)

  const { isMatch, isRequestMatch, isFolderMatch } = getMatchers(filterText)

  return withIndex(collections).filter(
    ({ data: collection }) =>
      isMatch(collection.name) ||
      collection.requests.some(isRequestMatch) ||
      collection.folders.some(isFolderMatch)
  )
}

/**
 * Returns the folders and requests of a collection or folder matching the
 * search text. Search reaches the direct children of a root collection and the
 * requests of its folders; anything deeper is listed as is.
 * @param depth Number of segments in the path of `parent` (1 for a root collection)
 */
export function searchCollectionChildren(
  parent: HoppCollection,
  depth: number,
  filterText: string
): { folders: Indexed<HoppCollection>[]; requests: Indexed<Request>[] } {
  const folders = withIndex(parent.folders)
  const requests = withIndex<Request>(parent.requests)

  if (filterText === "" || depth > 2) return { folders, requests }

  const { isMatch, isRequestMatch, isFolderMatch } = getMatchers(filterText)

  const matchingRequests = requests.filter(({ data }) => isRequestMatch(data))

  if (depth === 1)
    return {
      folders: folders.filter(({ data }) => isFolderMatch(data)),
      requests: matchingRequests,
    }

  // A folder found by its own name is listed whole
  if (isMatch(parent.name)) return { folders, requests }

  return { folders, requests: matchingRequests }
}
