import {
  HoppCollection,
  HoppRESTRequest,
  HoppGQLRequest,
} from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"

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

function findMatchingRequest(
  incoming: HoppRESTRequest | HoppGQLRequest,
  targetList: (HoppRESTRequest | HoppGQLRequest)[]
): { match: HoppRESTRequest | HoppGQLRequest; index: number } | null {
  const incomingRest = incoming as Partial<HoppRESTRequest>
  const incomingMethod = incomingRest.method
  const incomingEndpoint = incomingRest.endpoint?.trim().toLowerCase()

  // 1. First priority: match by method + endpoint
  if (incomingMethod && incomingEndpoint) {
    const idx = targetList.findIndex((t) => {
      const tRest = t as Partial<HoppRESTRequest>
      const tMethod = tRest.method
      const tEndpoint = tRest.endpoint?.trim().toLowerCase()
      return tMethod === incomingMethod && tEndpoint === incomingEndpoint
    })
    if (idx !== -1) return { match: targetList[idx], index: idx }
  }

  // 2. Second priority: match by request name
  const incomingName = incoming.name?.trim().toLowerCase()
  if (incomingName) {
    const idx = targetList.findIndex(
      (t) =>
        ("endpoint" in t) === ("endpoint" in incoming) &&
        t.name?.trim().toLowerCase() === incomingName
    )
    if (idx !== -1) return { match: targetList[idx], index: idx }
  }

  return null
}

function mergeRequest(
  existing: HoppRESTRequest | HoppGQLRequest,
  incoming: HoppRESTRequest | HoppGQLRequest,
  options: UpdateOptions,
  stats: UpdateSummaryData
): HoppRESTRequest | HoppGQLRequest {
  stats.updatedRequests++

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

function countSubTreeAdded(folder: HoppCollection, stats: UpdateSummaryData) {
  stats.addedRequests += folder.requests.length
  for (const sub of folder.folders) {
    stats.addedFolders++
    countSubTreeAdded(sub, stats)
  }
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

function countSubTreeDeleted(folder: HoppCollection, stats: UpdateSummaryData) {
  stats.deletedRequests += folder.requests.length
  for (const sub of folder.folders) {
    countSubTreeDeleted(sub, stats)
  }
}

function mergeRequestsList(
  targetRequests: (HoppRESTRequest | HoppGQLRequest)[],
  incomingRequests: (HoppRESTRequest | HoppGQLRequest)[],
  options: UpdateOptions,
  stats: UpdateSummaryData
): (HoppRESTRequest | HoppGQLRequest)[] {
  const result: (HoppRESTRequest | HoppGQLRequest)[] = []
  const matchedTargetIndices = new Set<number>()

  for (const incoming of incomingRequests) {
    const matched = findMatchingRequest(incoming, targetRequests)
    if (matched && !matchedTargetIndices.has(matched.index)) {
      matchedTargetIndices.add(matched.index)
      result.push(mergeRequest(matched.match, incoming, options, stats))
    } else {
      stats.addedRequests++
      result.push(cloneDeep(incoming))
    }
  }

  // Preserve or drop unmatched existing requests
  targetRequests.forEach((req, idx) => {
    if (!matchedTargetIndices.has(idx)) {
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
  stats: UpdateSummaryData
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
        stats
      )

      const mergedSubFolders = mergeFoldersList(
        existingFolder.folders,
        incomingFolder.folders,
        options,
        stats
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
      countSubTreeAdded(incomingFolder, stats)
      result.push(cloneDeep(incomingFolder))
    }
  }

  // Preserve or delete unmatched existing folders
  targetFolders.forEach((folder, idx) => {
    if (!matchedTargetIndices.has(idx)) {
      if (options.keepMissingRequests !== false) {
        countSubTreePreserved(folder, stats, options)
        result.push(cloneDeep(folder))
      } else {
        countSubTreeDeleted(folder, stats)
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

  const mergedFolders = mergeFoldersList(
    targetCollection.folders,
    incomingFolders,
    options,
    stats
  )

  const mergedRequests = mergeRequestsList(
    targetCollection.requests,
    incomingRequests,
    options,
    stats
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
