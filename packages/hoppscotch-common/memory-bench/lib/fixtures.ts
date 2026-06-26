/**
 * Synthetic collection fixtures for the memory harness.
 *
 * The realistic case from issue #5883 is "a collection of ~20 requests". Twenty
 * small request objects are far below Node heap measurement noise, so the cost
 * and leak scenarios scale the request count up to lift the signal cleanly above
 * noise. The effect under test (whole-tree `cloneDeep` per store emission) scales
 * linearly with request count, so the scaled numbers characterise the realistic
 * case proportionally. Both the realistic (20) and scaled sizes are reported.
 */
import { getDefaultRESTRequest } from "@hoppscotch/data"
import type { HoppCollection } from "@hoppscotch/data"
import { makeCollection } from "@hoppscotch/data"

/** A unique, realistically-shaped REST request. */
export function makeRequest(i: number): ReturnType<typeof getDefaultRESTRequest> {
  const req = getDefaultRESTRequest()
  return {
    ...req,
    name: `Request ${i}`,
    endpoint: `https://api.example.com/v1/resource/${i}`,
    headers: [
      { key: "Accept", value: "application/json", active: true, description: "" },
      {
        key: "X-Trace-Id",
        value: `trace-${i}-${"x".repeat(24)}`,
        active: true,
        description: "",
      },
    ],
    params: [
      { key: "page", value: String(i), active: true, description: "" },
    ],
  }
}

function emptyCollectionFields() {
  return {
    headers: [],
    auth: { authType: "inherit", authActive: true } as const,
    variables: [],
  }
}

/**
 * Build a collection tree with `requestCount` requests, split across
 * `folderCount` nested folders plus the root. Mirrors how an imported
 * collection is shaped (folders containing requests).
 */
export function makeCollectionTree(
  requestCount: number,
  folderCount = 4,
  name = "Benchmark Collection"
): HoppCollection {
  const perFolder = Math.floor(requestCount / (folderCount + 1))
  let made = 0

  const folders: HoppCollection[] = []
  for (let f = 0; f < folderCount; f++) {
    const reqs = []
    for (let r = 0; r < perFolder; r++) reqs.push(makeRequest(made++))
    folders.push(
      makeCollection({
        name: `Folder ${f}`,
        folders: [],
        requests: reqs,
        ...emptyCollectionFields(),
      })
    )
  }

  const rootRequests = []
  while (made < requestCount) rootRequests.push(makeRequest(made++))

  return makeCollection({
    name,
    folders,
    requests: rootRequests,
    ...emptyCollectionFields(),
  })
}

/** N independent top-level collections, each a tree of `perCollection` requests. */
export function makeCollections(
  collectionCount: number,
  perCollection: number
): HoppCollection[] {
  return Array.from({ length: collectionCount }, (_, c) =>
    makeCollectionTree(perCollection, 4, `Collection ${c}`)
  )
}
