import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"

export const getRequestSelectionID = (
  request: HoppRESTRequest,
  path: number[]
) => request._ref_id ?? `path:${path.join("/")}`

/**
 * Recursively collects the selection IDs of every request in a collection tree,
 * depth-first, with folder-nested requests carrying their positional path.
 */
export const collectRequestIDs = (
  collection: HoppCollection,
  parentPath: number[] = []
): string[] => [
  ...collection.requests.map((request, index) =>
    getRequestSelectionID(request as HoppRESTRequest, [...parentPath, index])
  ),
  ...collection.folders.flatMap((folder, index) =>
    collectRequestIDs(folder, [...parentPath, index])
  ),
]
