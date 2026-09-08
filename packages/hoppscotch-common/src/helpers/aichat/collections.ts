import type { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"

export interface FoundRequest {
  request: HoppRESTRequest
  /** Index path of the parent folder, e.g. "0" or "0/2". */
  folderPath: string
  /** Index of the request within its parent folder. */
  requestIndex: number
}

/** Comma-joined list of request names across the tree (capped), for hints. */
export function listRequestNames(
  collections: HoppCollection[],
  max = 25
): string {
  const names: string[] = []
  const walk = (nodes: HoppCollection[]) => {
    for (const c of nodes) {
      for (const req of (c.requests ?? []) as HoppRESTRequest[]) {
        const n = req.name || req.endpoint
        if (n && names.length < max) names.push(n)
      }
      walk(c.folders ?? [])
    }
  }
  walk(collections)
  return names.join(", ")
}

/** Finds a top-level collection by name (case-insensitive). */
export function findTopLevelCollection(
  collections: HoppCollection[],
  name: string
): { collection: HoppCollection; index: number } | null {
  const n = name.trim().toLowerCase()
  const index = collections.findIndex((c) => (c.name ?? "").toLowerCase() === n)
  return index === -1 ? null : { collection: collections[index], index }
}

/**
 * Finds the first request matching `reqName` in the tree, optionally restricted
 * to the subtree of a collection/folder named `collectionName`. Returns its
 * index-path folder and request index (what the tab save-context needs).
 */
export function findRequestInTree(
  collections: HoppCollection[],
  reqName: string,
  collectionName?: string
): FoundRequest | null {
  const target = reqName.trim().toLowerCase()
  const scope = collectionName?.trim().toLowerCase()

  // Collect every request in scope, then rank matches — tolerant of the model
  // passing a slightly-off name (e.g. with the method prefix, or the endpoint).
  const candidates: FoundRequest[] = []
  const walk = (nodes: HoppCollection[], path: number[], inScope: boolean) => {
    nodes.forEach((c, ci) => {
      const childPath = [...path, ci]
      const here = !scope || inScope || (c.name ?? "").toLowerCase() === scope
      if (here) {
        ;(c.requests ?? []).forEach((req, ri) => {
          candidates.push({
            request: req as HoppRESTRequest,
            folderPath: childPath.join("/"),
            requestIndex: ri,
          })
        })
      }
      walk(c.folders ?? [], childPath, here)
    })
  }
  walk(collections, [], !scope)

  const name = (f: FoundRequest) => (f.request.name ?? "").toLowerCase()
  const endpoint = (f: FoundRequest) => (f.request.endpoint ?? "").toLowerCase()

  return (
    candidates.find((f) => name(f) === target) ??
    candidates.find((f) => name(f) && name(f).includes(target)) ??
    candidates.find((f) => name(f) && target.includes(name(f))) ??
    candidates.find((f) => endpoint(f).includes(target)) ??
    null
  )
}
