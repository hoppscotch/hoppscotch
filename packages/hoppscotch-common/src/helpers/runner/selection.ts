import {
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"

export const getRequestSelectionID = (
  request: HoppRESTRequest | HoppGQLRequest,
  path: number[]
) => request._ref_id || `path:${path.join("/")}`

/**
 * Applies a run sequence to a list of items keyed by selection ID.
 *
 * Items named by `runOrder` come first, in the position it gives them; the
 * rest keep their original relative order behind them, so a request added
 * after the sequence was saved still runs.
 */
export const applyRunOrder = <T extends { id: string }>(
  items: T[],
  runOrder: Map<string, number>
): T[] => {
  const positionOf = (item: T) =>
    runOrder.get(item.id) ?? Number.MAX_SAFE_INTEGER

  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) => positionOf(a.item) - positionOf(b.item) || a.index - b.index
    )
    .map(({ item }) => item)
}

/**
 * Recursively collects the selection IDs of every request in a collection
 * tree, in the runner's execution order: folders (depth-first) before a
 * node's own requests. `RunnerRequestSelector` and `planCollection` flatten
 * with the same rule — the three must agree or the displayed run sequence
 * stops matching the executed one.
 */
export const collectRequestIDs = (
  collection: HoppCollection,
  parentPath: number[] = []
): string[] => [
  ...collection.folders.flatMap((folder, index) =>
    collectRequestIDs(folder, [...parentPath, index])
  ),
  ...collection.requests.map((request, index) =>
    getRequestSelectionID(request as HoppRESTRequest, [...parentPath, index])
  ),
]
