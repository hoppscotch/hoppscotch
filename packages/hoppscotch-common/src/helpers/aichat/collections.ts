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

/** How a lookup reads a tree: personal (`folders`) and team (`children`) alike. */
export interface TreeAccess<T> {
  name: (node: T) => string
  children: (node: T) => T[] | null | undefined
}

/** A node a collection argument named, and where it sits. */
export interface TreeMatch<T> {
  node: T
  /** Ancestors from the top level down, the node excluded. */
  ancestors: T[]
  /** Index of each level from the top down, the node included. */
  indices: number[]
  /** "Parent/Child" — what replies and confirmations show. */
  label: string
}

/** A unique hit, several (their labels), or none. */
export type Lookup<F> = { found: F } | { ambiguous: string[] } | null

/**
 * A collection argument: a bare name, a "Parent/Child" path matched against
 * the tail of each node's path, or "/Parent/Child" anchored at the top level.
 */
/** A name or path as lowercase "/"-separated parts. */
const pathParts = (text: string) =>
  text
    .split("/")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

export function parseCollectionRef(ref: string) {
  const raw = ref.trim()
  return {
    anchored: raw.startsWith("/"),
    segments: pathParts(raw),
  }
}

const display = (name: string) => name.trim() || "Untitled"

/**
 * Every node `ref` names (see `parseCollectionRef`), shallowest first. Never
 * picks one: callers that act on a single node must refuse on several.
 *
 * A name with "/" in it counts as several parts, so the "/Top/v1/beta" a
 * refusal lists resolves for a folder named "v1/beta" too.
 */
export function matchTreeNodes<T>(
  roots: T[],
  ref: string,
  access: TreeAccess<T>
): TreeMatch<T>[] {
  const { anchored, segments } = parseCollectionRef(ref)
  if (!segments.length) return []
  const out: TreeMatch<T>[] = []
  const walk = (
    nodes: T[],
    ancestors: T[],
    indices: number[],
    chain: string[],
    starts: number[]
  ) => {
    nodes.forEach((node, i) => {
      const own = pathParts(access.name(node))
      const names = [...chain, ...own]
      const nameStarts = [...starts, chain.length]
      // The match must begin where a name begins and cover this node's name.
      const from = names.length - segments.length
      const matched =
        own.length > 0 &&
        from >= 0 &&
        (anchored ? from === 0 : nameStarts.includes(from)) &&
        segments.every((s, k) => names[from + k] === s)
      if (matched) {
        out.push({
          node,
          ancestors,
          indices: [...indices, i],
          label: [...ancestors, node]
            .map((n) => display(access.name(n)))
            .join("/"),
        })
      }
      walk(
        access.children(node) ?? [],
        [...ancestors, node],
        [...indices, i],
        names,
        nameStarts
      )
    })
  }
  walk(roots, [], [], [], [])
  // Stable: tree order within a depth.
  return out.sort((a, b) => a.indices.length - b.indices.length)
}

/** Reply for an argument that matched several nodes: lists their paths. */
export function describeAmbiguous(
  what: string,
  ref: string,
  labels: string[],
  hint = "pass one of these paths"
): string {
  const shared = new Set(labels).size < labels.length
  return `Several ${what} match "${ref}": ${labels
    .map((l) => `/${l}`)
    .join(", ")} — ${hint}.${
    shared ? " Some share a path; rename one first." : ""
  }`
}

const REST_TREE: TreeAccess<HoppCollection> = {
  name: (c) => c.name ?? "",
  children: (c) => c.folders,
}

export interface FoundCollection {
  collection: HoppCollection
  /** Index path of the node, e.g. "0" (top-level) or "0/2" (nested folder). */
  path: string
  /** "Parent/Child", for replies and confirmations. */
  label: string
}

/**
 * Resolves a collection or folder argument (name or path, case-insensitive).
 * A name shared by several nodes is reported, never guessed: these lookups
 * precede deletes and overwrites.
 */
export function lookupCollection(
  collections: HoppCollection[],
  ref: string
): Lookup<FoundCollection> {
  const matches = matchTreeNodes(collections, ref, REST_TREE)
  if (!matches.length) return null
  if (matches.length > 1) return { ambiguous: matches.map((m) => m.label) }
  const [m] = matches
  return {
    found: { collection: m.node, path: m.indices.join("/"), label: m.label },
  }
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

/** Every request in the tree, or under the nodes `collectionRef` names. */
function requestsInScope(
  collections: HoppCollection[],
  collectionRef?: string
): Array<FoundRequest & { label: string }> {
  const scope = collectionRef?.trim()
    ? new Set(
        matchTreeNodes(collections, collectionRef, REST_TREE).map((m) => m.node)
      )
    : null
  const out: Array<FoundRequest & { label: string }> = []
  const walk = (
    nodes: HoppCollection[],
    path: number[],
    labels: string[],
    inScope: boolean
  ) => {
    nodes.forEach((c, ci) => {
      const childPath = [...path, ci]
      const childLabels = [...labels, display(c.name ?? "")]
      const here = inScope || !!scope?.has(c)
      if (here) {
        ;(c.requests ?? []).forEach((req, ri) => {
          const request = req as HoppRESTRequest
          out.push({
            request,
            folderPath: childPath.join("/"),
            requestIndex: ri,
            label: [...childLabels, display(request.name ?? "")].join("/"),
          })
        })
      }
      walk(c.folders ?? [], childPath, childLabels, here)
    })
  }
  walk(collections, [], [], !scope)
  return out
}

/**
 * Finds the first request matching `reqName` in the tree, optionally restricted
 * to the subtree of the collections/folders `collectionRef` names. Tolerant
 * (substring, endpoint): only for read-only uses like opening a tab.
 */
export function findRequestInTree(
  collections: HoppCollection[],
  reqName: string,
  collectionRef?: string
): FoundRequest | null {
  const target = reqName.trim().toLowerCase()
  const candidates = requestsInScope(collections, collectionRef)

  const name = (f: FoundRequest) => (f.request.name ?? "").toLowerCase()
  const endpoint = (f: FoundRequest) => (f.request.endpoint ?? "").toLowerCase()

  const hit =
    candidates.find((f) => name(f) === target) ??
    candidates.find((f) => name(f) && name(f).includes(target)) ??
    candidates.find((f) => name(f) && target.includes(name(f))) ??
    candidates.find((f) => endpoint(f).includes(target))
  return hit
    ? {
        request: hit.request,
        folderPath: hit.folderPath,
        requestIndex: hit.requestIndex,
      }
    : null
}

/**
 * Exact (case-insensitive) request-name lookup for writes: a near miss must
 * not overwrite another request, and a repeated name is reported.
 */
export function lookupRequest(
  collections: HoppCollection[],
  reqName: string,
  collectionRef?: string
): Lookup<FoundRequest & { label: string }> {
  const target = reqName.trim().toLowerCase()
  if (!target) return null
  const hits = requestsInScope(collections, collectionRef).filter(
    (f) => (f.request.name ?? "").trim().toLowerCase() === target
  )
  if (!hits.length) return null
  if (hits.length > 1) return { ambiguous: hits.map((h) => h.label) }
  return { found: hits[0] }
}

/**
 * Picks an item by name: an exact (case-insensitive) match, else a UNIQUE
 * partial match; several partial matches are reported, not guessed.
 */
export function pickByName<T>(
  items: T[],
  name: string,
  nameOf: (item: T) => string
): { item: T } | { ambiguous: T[] } | null {
  const n = name.trim().toLowerCase()
  if (!n) return null
  const exact = items.filter((i) => nameOf(i).trim().toLowerCase() === n)
  if (exact.length === 1) return { item: exact[0] }
  if (exact.length > 1) return { ambiguous: exact }
  const partial = items.filter((i) => nameOf(i).toLowerCase().includes(n))
  if (partial.length === 1) return { item: partial[0] }
  if (partial.length > 1) return { ambiguous: partial }
  return null
}
