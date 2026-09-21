import {
  HoppCollection,
  HoppRESTRequest,
  HoppGQLRequest,
  isGQLRequest,
} from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"
import { flushLocalStoresForCollectionTree } from "~/helpers/clientLocalVariables"

export type UpdateOptions = {
  preserveScripts?: boolean
  keepMissingRequests?: boolean
}

export type UpdateSummaryData = {
  updatedRequests: number
  addedRequests: number
  preservedRequests: number
  deletedRequests: number
  updatedFolders: number
  addedFolders: number
  preservedScripts: number
}

function mergeRequest(
  existing: HoppRESTRequest | HoppGQLRequest,
  incoming: HoppRESTRequest | HoppGQLRequest,
  options: UpdateOptions,
  stats: UpdateSummaryData
): HoppRESTRequest | HoppGQLRequest {
  stats.updatedRequests++

  if (isGQLRequest(incoming) && isGQLRequest(existing)) {
    let preRequestScript = incoming.preRequestScript ?? ""
    let testScript = incoming.testScript ?? ""

    if (options.preserveScripts !== false) {
      if (existing.preRequestScript && existing.preRequestScript.trim()) {
        preRequestScript = existing.preRequestScript
        stats.preservedScripts++
      }
      if (existing.testScript && existing.testScript.trim()) {
        testScript = existing.testScript
        stats.preservedScripts++
      }
    }

    const description =
      incoming.description && incoming.description.trim()
        ? incoming.description
        : (existing.description ?? null)

    return {
      ...cloneDeep(incoming),
      id: existing.id,
      _ref_id: existing._ref_id,
      preRequestScript,
      testScript,
      description,
    } as HoppGQLRequest
  }

  const existingRest = existing as Partial<HoppRESTRequest>
  const incomingRest = incoming as Partial<HoppRESTRequest>

  // Preserve existing custom scripts if requested and existing had them
  let preRequestScript = incomingRest.preRequestScript ?? ""
  let testScript = incomingRest.testScript ?? ""

  if (options.preserveScripts !== false) {
    if (existingRest.preRequestScript && existingRest.preRequestScript.trim()) {
      preRequestScript = existingRest.preRequestScript
      stats.preservedScripts++
    }
    if (existingRest.testScript && existingRest.testScript.trim()) {
      testScript = existingRest.testScript
      stats.preservedScripts++
    }
  }

  const description =
    incomingRest.description && incomingRest.description.trim()
      ? incomingRest.description
      : (existingRest.description ?? null)

  return {
    ...cloneDeep(incoming),
    id: existing.id,
    _ref_id: existing._ref_id,
    preRequestScript,
    testScript,
    description,
  } as HoppRESTRequest | HoppGQLRequest
}

function countSubTreePreserved(
  folder: HoppCollection,
  stats: UpdateSummaryData,
  options: UpdateOptions
) {
  stats.preservedRequests += folder.requests.length

  if (options.preserveScripts !== false) {
    if (folder.preRequestScript && folder.preRequestScript.trim()) {
      stats.preservedScripts++
    }
    if (folder.testScript && folder.testScript.trim()) {
      stats.preservedScripts++
    }
    for (const req of folder.requests) {
      const r = req as Partial<HoppRESTRequest>
      if (r.preRequestScript && r.preRequestScript.trim()) {
        stats.preservedScripts++
      }
      if (r.testScript && r.testScript.trim()) {
        stats.preservedScripts++
      }
    }
  }

  for (const sub of folder.folders) {
    countSubTreePreserved(sub, stats, options)
  }
}

function countSubTreeDeleted(
  folder: HoppCollection,
  stats: UpdateSummaryData,
  claimedExistingRequests?: Set<HoppRESTRequest | HoppGQLRequest>
) {
  for (const req of folder.requests) {
    if (!claimedExistingRequests || !claimedExistingRequests.has(req)) {
      stats.deletedRequests++
    }
  }
  for (const sub of folder.folders) {
    countSubTreeDeleted(sub, stats, claimedExistingRequests)
  }
}

function filterClaimedFromSubtree(
  folder: HoppCollection,
  claimedExistingRequests: Set<HoppRESTRequest | HoppGQLRequest>
): HoppCollection {
  return {
    ...folder,
    requests: folder.requests.filter(
      (req) => !claimedExistingRequests.has(req)
    ),
    folders: folder.folders.map((sub) =>
      filterClaimedFromSubtree(sub, claimedExistingRequests)
    ),
  }
}

function getRestEndpointKey(req: HoppRESTRequest): string | null {
  const method = req.method?.toUpperCase()
  const endpoint = req.endpoint?.trim().toLowerCase()
  if (method && endpoint) {
    return `${method}:::${endpoint}`
  }
  return null
}

function buildTreeWideRestIndex(
  collection: HoppCollection
): Map<string, HoppRESTRequest[]> {
  const index = new Map<string, HoppRESTRequest[]>()

  function walk(node: HoppCollection) {
    for (const req of node.requests) {
      if (!isGQLRequest(req)) {
        const key = getRestEndpointKey(req as HoppRESTRequest)
        if (key) {
          const list = index.get(key) ?? []
          list.push(req as HoppRESTRequest)
          index.set(key, list)
        }
      }
    }
    for (const sub of node.folders) {
      walk(sub)
    }
  }

  walk(collection)
  return index
}

type CorrespondingFolderPair = {
  targetFolder: HoppCollection
  incomingFolder: HoppCollection
}

function collectCorrespondingFolderPairs(
  targetFolders: HoppCollection[],
  incomingFolders: HoppCollection[],
  pairs: CorrespondingFolderPair[]
) {
  const matchedTargetIndices = new Set<number>()

  for (const incoming of incomingFolders) {
    const incomingName = incoming.name?.trim().toLowerCase()
    const targetIdx = targetFolders.findIndex(
      (f, idx) =>
        !matchedTargetIndices.has(idx) &&
        f.name?.trim().toLowerCase() === incomingName
    )

    if (targetIdx !== -1) {
      matchedTargetIndices.add(targetIdx)
      const existing = targetFolders[targetIdx]
      pairs.push({ targetFolder: existing, incomingFolder: incoming })
      collectCorrespondingFolderPairs(existing.folders, incoming.folders, pairs)
    }
  }
}

function reconcileRequestsTree(
  targetCollection: HoppCollection,
  incomingCollections: HoppCollection[]
): {
  incomingToExistingMap: Map<
    HoppRESTRequest | HoppGQLRequest,
    HoppRESTRequest | HoppGQLRequest
  >
  claimedExistingRequests: Set<HoppRESTRequest | HoppGQLRequest>
} {
  const incomingToExistingMap = new Map<
    HoppRESTRequest | HoppGQLRequest,
    HoppRESTRequest | HoppGQLRequest
  >()
  const claimedExistingRequests = new Set<HoppRESTRequest | HoppGQLRequest>()

  const treeWideRestIndex = buildTreeWideRestIndex(targetCollection)

  let incomingFolders: HoppCollection[] = []
  let rootIncomingRequests: (HoppRESTRequest | HoppGQLRequest)[] = []

  if (incomingCollections.length === 1) {
    incomingFolders = incomingCollections[0].folders
    rootIncomingRequests = incomingCollections[0].requests
  } else if (incomingCollections.length > 1) {
    incomingFolders = incomingCollections.map((col) => ({
      ...cloneDeep(col),
      name: col.name,
    }))
    rootIncomingRequests = []
  }

  // 1. Identify all corresponding folder pairs
  const folderPairs: CorrespondingFolderPair[] = [
    {
      targetFolder: targetCollection,
      incomingFolder: {
        ...targetCollection,
        requests: rootIncomingRequests,
        folders: incomingFolders,
      },
    },
  ]
  collectCorrespondingFolderPairs(
    targetCollection.folders,
    incomingFolders,
    folderPairs
  )

  // Collect all incoming requests across the entire incoming tree
  const allIncomingRequests: {
    request: HoppRESTRequest | HoppGQLRequest
    targetFolder: HoppCollection | null
  }[] = []

  // Add root incoming requests
  for (const req of rootIncomingRequests) {
    allIncomingRequests.push({ request: req, targetFolder: targetCollection })
  }

  function collectIncomingFromFolders(
    folders: HoppCollection[],
    targetFolders: HoppCollection[]
  ) {
    const matchedTargetIndices = new Set<number>()
    for (const folder of folders) {
      const incomingName = folder.name?.trim().toLowerCase()
      const targetIdx = targetFolders.findIndex(
        (f, idx) =>
          !matchedTargetIndices.has(idx) &&
          f.name?.trim().toLowerCase() === incomingName
      )
      const matchingTarget = targetIdx !== -1 ? targetFolders[targetIdx] : null
      if (targetIdx !== -1) {
        matchedTargetIndices.add(targetIdx)
      }

      for (const req of folder.requests) {
        allIncomingRequests.push({ request: req, targetFolder: matchingTarget })
      }

      collectIncomingFromFolders(
        folder.folders,
        matchingTarget ? matchingTarget.folders : []
      )
    }
  }

  collectIncomingFromFolders(incomingFolders, targetCollection.folders)

  // Stage 1: Local match (method + endpoint for REST, url for GQL) within corresponding folder
  for (const { request: incoming, targetFolder } of allIncomingRequests) {
    if (!targetFolder) continue

    const incomingIsGql = isGQLRequest(incoming)

    if (!incomingIsGql) {
      const incomingKey = getRestEndpointKey(incoming as HoppRESTRequest)
      if (incomingKey) {
        const localMatch = targetFolder.requests.find((t) => {
          if (isGQLRequest(t) || claimedExistingRequests.has(t)) return false
          return getRestEndpointKey(t as HoppRESTRequest) === incomingKey
        })
        if (localMatch) {
          incomingToExistingMap.set(incoming, localMatch)
          claimedExistingRequests.add(localMatch)
        }
      }
    } else {
      const incomingGql = incoming as HoppGQLRequest
      const incomingUrl = incomingGql.url?.trim().toLowerCase()
      if (incomingUrl) {
        const localMatch = targetFolder.requests.find((t) => {
          if (!isGQLRequest(t) || claimedExistingRequests.has(t)) return false
          return (t as HoppGQLRequest).url?.trim().toLowerCase() === incomingUrl
        })
        if (localMatch) {
          incomingToExistingMap.set(incoming, localMatch)
          claimedExistingRequests.add(localMatch)
        }
      }
    }
  }

  // Stage 2: Tree-wide match by method + endpoint for remaining unmatched REST requests
  // (handles moved endpoints and OpenAPI tag/folder renames)
  for (const { request: incoming } of allIncomingRequests) {
    if (incomingToExistingMap.has(incoming)) continue
    if (isGQLRequest(incoming)) continue

    const incomingKey = getRestEndpointKey(incoming as HoppRESTRequest)
    if (incomingKey) {
      const candidates = treeWideRestIndex.get(incomingKey)
      if (candidates) {
        const treeMatch = candidates.find(
          (c) => !claimedExistingRequests.has(c)
        )
        if (treeMatch) {
          incomingToExistingMap.set(incoming, treeMatch)
          claimedExistingRequests.add(treeMatch)
        }
      }
    }
  }

  // Stage 3: Local name fallback within corresponding folder (strictly same request kind)
  for (const { request: incoming, targetFolder } of allIncomingRequests) {
    if (incomingToExistingMap.has(incoming)) continue
    if (!targetFolder) continue

    const incomingIsGql = isGQLRequest(incoming)
    const incomingName = incoming.name?.trim().toLowerCase()

    if (incomingName) {
      const nameMatch = targetFolder.requests.find((t) => {
        if (claimedExistingRequests.has(t)) return false
        // Restrict fallback to requests of the same kind
        if (isGQLRequest(t) !== incomingIsGql) return false
        return t.name?.trim().toLowerCase() === incomingName
      })
      if (nameMatch) {
        incomingToExistingMap.set(incoming, nameMatch)
        claimedExistingRequests.add(nameMatch)
      }
    }
  }

  return { incomingToExistingMap, claimedExistingRequests }
}

function mergeRequestsList(
  targetRequests: (HoppRESTRequest | HoppGQLRequest)[],
  incomingRequests: (HoppRESTRequest | HoppGQLRequest)[],
  options: UpdateOptions,
  stats: UpdateSummaryData,
  incomingToExistingMap: Map<
    HoppRESTRequest | HoppGQLRequest,
    HoppRESTRequest | HoppGQLRequest
  >,
  claimedExistingRequests: Set<HoppRESTRequest | HoppGQLRequest>
): (HoppRESTRequest | HoppGQLRequest)[] {
  const result: (HoppRESTRequest | HoppGQLRequest)[] = []

  for (const incoming of incomingRequests) {
    const matched = incomingToExistingMap.get(incoming)
    if (matched) {
      result.push(mergeRequest(matched, incoming, options, stats))
    } else {
      stats.addedRequests++
      result.push(cloneDeep(incoming))
    }
  }

  // Preserve or drop unmatched existing requests
  targetRequests.forEach((req) => {
    if (!claimedExistingRequests.has(req)) {
      if (options.keepMissingRequests !== false) {
        stats.preservedRequests++
        if (options.preserveScripts !== false) {
          const r = req as Partial<HoppRESTRequest>
          if (r.preRequestScript && r.preRequestScript.trim()) {
            stats.preservedScripts++
          }
          if (r.testScript && r.testScript.trim()) {
            stats.preservedScripts++
          }
        }
        result.push(cloneDeep(req))
      } else {
        stats.deletedRequests++
      }
    }
  })

  return result
}

function mergeFoldersList(
  targetFolders: HoppCollection[],
  incomingFolders: HoppCollection[],
  options: UpdateOptions,
  stats: UpdateSummaryData,
  incomingToExistingMap: Map<
    HoppRESTRequest | HoppGQLRequest,
    HoppRESTRequest | HoppGQLRequest
  >,
  claimedExistingRequests: Set<HoppRESTRequest | HoppGQLRequest>
): HoppCollection[] {
  const result: HoppCollection[] = []
  const matchedTargetIndices = new Set<number>()

  for (const incomingFolder of incomingFolders) {
    const incomingName = incomingFolder.name?.trim().toLowerCase()
    const targetIdx = targetFolders.findIndex(
      (f, idx) =>
        !matchedTargetIndices.has(idx) &&
        f.name?.trim().toLowerCase() === incomingName
    )

    if (targetIdx !== -1) {
      matchedTargetIndices.add(targetIdx)
      stats.updatedFolders++
      const existingFolder = targetFolders[targetIdx]

      const mergedRequests = mergeRequestsList(
        existingFolder.requests,
        incomingFolder.requests,
        options,
        stats,
        incomingToExistingMap,
        claimedExistingRequests
      )

      const mergedSubFolders = mergeFoldersList(
        existingFolder.folders,
        incomingFolder.folders,
        options,
        stats,
        incomingToExistingMap,
        claimedExistingRequests
      )

      if (options.preserveScripts !== false) {
        if (
          existingFolder.preRequestScript &&
          existingFolder.preRequestScript.trim()
        ) {
          stats.preservedScripts++
        }
        if (existingFolder.testScript && existingFolder.testScript.trim()) {
          stats.preservedScripts++
        }
      }

      const mergedFolder: HoppCollection = {
        ...cloneDeep(incomingFolder),
        id: existingFolder.id,
        _ref_id: existingFolder._ref_id,
        name: existingFolder.name,
        auth: incomingFolder.auth ?? existingFolder.auth,
        headers:
          incomingFolder.headers && incomingFolder.headers.length > 0
            ? incomingFolder.headers
            : existingFolder.headers,
        variables:
          incomingFolder.variables && incomingFolder.variables.length > 0
            ? incomingFolder.variables
            : existingFolder.variables,
        description: incomingFolder.description ?? existingFolder.description,
        preRequestScript:
          options.preserveScripts !== false &&
          existingFolder.preRequestScript?.trim()
            ? existingFolder.preRequestScript
            : (incomingFolder.preRequestScript ??
              existingFolder.preRequestScript),
        testScript:
          options.preserveScripts !== false && existingFolder.testScript?.trim()
            ? existingFolder.testScript
            : (incomingFolder.testScript ?? existingFolder.testScript),
        requests: mergedRequests,
        folders: mergedSubFolders,
      }

      result.push(mergedFolder)
    } else {
      stats.addedFolders++
      const mergedRequests = mergeRequestsList(
        [],
        incomingFolder.requests,
        options,
        stats,
        incomingToExistingMap,
        claimedExistingRequests
      )
      const mergedSubFolders = mergeFoldersList(
        [],
        incomingFolder.folders,
        options,
        stats,
        incomingToExistingMap,
        claimedExistingRequests
      )
      result.push({
        ...cloneDeep(incomingFolder),
        requests: mergedRequests,
        folders: mergedSubFolders,
      })
    }
  }

  // Preserve or delete unmatched existing folders
  targetFolders.forEach((folder, idx) => {
    if (!matchedTargetIndices.has(idx)) {
      if (options.keepMissingRequests !== false) {
        const preservedFolder = filterClaimedFromSubtree(
          folder,
          claimedExistingRequests
        )
        countSubTreePreserved(preservedFolder, stats, options)
        result.push(preservedFolder)
      } else {
        countSubTreeDeleted(folder, stats, claimedExistingRequests)
        flushLocalStoresForCollectionTree(folder)
      }
    }
  })

  return result
}

export function mergeCollectionTree(
  targetCollection: HoppCollection,
  incomingCollections: HoppCollection[],
  options: UpdateOptions = { preserveScripts: true, keepMissingRequests: true }
): { updatedCollection: HoppCollection; stats: UpdateSummaryData } {
  const stats: UpdateSummaryData = {
    updatedRequests: 0,
    addedRequests: 0,
    preservedRequests: 0,
    deletedRequests: 0,
    updatedFolders: 0,
    addedFolders: 0,
    preservedScripts: 0,
  }

  if (options.preserveScripts !== false) {
    if (
      targetCollection.preRequestScript &&
      targetCollection.preRequestScript.trim()
    ) {
      stats.preservedScripts++
    }
    if (targetCollection.testScript && targetCollection.testScript.trim()) {
      stats.preservedScripts++
    }
  }

  let incomingFolders: HoppCollection[] = []
  let incomingRequests: (HoppRESTRequest | HoppGQLRequest)[] = []
  const firstImported = incomingCollections[0]

  if (incomingCollections.length === 1) {
    incomingFolders = incomingCollections[0].folders
    incomingRequests = incomingCollections[0].requests
  } else if (incomingCollections.length > 1) {
    // If multiple collections (e.g. from OpenAPI tags where each tag is a top-level collection)
    // Check if target has folders matching collection names or treat each collection as a folder
    incomingFolders = incomingCollections.map((col) => ({
      ...cloneDeep(col),
      name: col.name,
    }))
    incomingRequests = []
  }

  const { incomingToExistingMap, claimedExistingRequests } =
    reconcileRequestsTree(targetCollection, incomingCollections)

  const mergedFolders = mergeFoldersList(
    targetCollection.folders,
    incomingFolders,
    options,
    stats,
    incomingToExistingMap,
    claimedExistingRequests
  )

  const mergedRequests = mergeRequestsList(
    targetCollection.requests,
    incomingRequests,
    options,
    stats,
    incomingToExistingMap,
    claimedExistingRequests
  )

  const updatedCollection: HoppCollection = {
    ...targetCollection,
    folders: mergedFolders,
    requests: mergedRequests,
    auth: firstImported?.auth ?? targetCollection.auth,
    headers:
      firstImported?.headers && firstImported.headers.length > 0
        ? firstImported.headers
        : targetCollection.headers,
    variables:
      firstImported?.variables && firstImported.variables.length > 0
        ? firstImported.variables
        : targetCollection.variables,
    description: firstImported?.description ?? targetCollection.description,
    preRequestScript:
      options.preserveScripts !== false &&
      targetCollection.preRequestScript?.trim()
        ? targetCollection.preRequestScript
        : (firstImported?.preRequestScript ??
          targetCollection.preRequestScript),
    testScript:
      options.preserveScripts !== false && targetCollection.testScript?.trim()
        ? targetCollection.testScript
        : (firstImported?.testScript ?? targetCollection.testScript),
  }

  return { updatedCollection, stats }
}
