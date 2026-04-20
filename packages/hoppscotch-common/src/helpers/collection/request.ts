import {
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
  RESTReqSchemaVersion,
} from "@hoppscotch/data"
import { getAffectedIndexes } from "./affectedIndex"
import { RESTTabService } from "~/services/tab/rest"
import { getService } from "~/modules/dioc"

// LocalStorage Keys
const ATTACHMENTS_KEY = "persisted_rest_attachments";

/**
 * Save REST request attachments to localStorage
 */
export function persistAttachments(requestID: string, attachments: any[]) {
  const saved = JSON.parse(localStorage.getItem(ATTACHMENTS_KEY) || "{}");
  saved[requestID] = attachments;
  localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify(saved));
}

/**
 * Load persisted attachments for a specific request ID
 */
export function loadPersistedAttachments(requestID: string): any[] {
  const saved = JSON.parse(localStorage.getItem(ATTACHMENTS_KEY) || "{}");
  return saved[requestID] || [];
}

/**
 * Resolve save context on reorder
 */
export function resolveSaveContextOnRequestReorder(payload: {
  lastIndex: number
  folderPath: string
  newIndex: number
  length?: number
}) {
  const { lastIndex, folderPath, length } = payload
  let { newIndex } = payload

  if (newIndex > lastIndex) newIndex--
  if (lastIndex === newIndex) return

  const affectedIndexes = getAffectedIndexes(
    lastIndex,
    newIndex === -1 ? length! : newIndex
  )

  if (newIndex === -1) affectedIndexes.delete(lastIndex)

  const tabService = getService(RESTTabService)
  const tabs = tabService.getTabsRefTo((tab) => {
    return (
      tab.document.saveContext?.originLocation === "user-collection" &&
      tab.document.saveContext.folderPath === folderPath &&
      affectedIndexes.has(tab.document.saveContext.requestIndex)
    )
  })

  for (const tab of tabs) {
    const doc = tab.value.document
    const context = doc.saveContext

    // ✅ Persist attachments (if any) using request.name or fallback
    if (doc.request.attachments) {
      const id = context?.requestID || doc.request.name || "unnamed-request"
      persistAttachments(id, doc.request.attachments)
    }

    if (context?.originLocation === "user-collection") {
      const newIndex = affectedIndexes.get(context.requestIndex)!
      context.requestIndex = newIndex
    }
  }
}

/**
 * Get all requests from a folder path
 */
export function getRequestsByPath(
  collections: HoppCollection[],
  path: string
): HoppRESTRequest[] | HoppGQLRequest[] {
  const pathArray = path.split("/").map((index) => parseInt(index))

  let currentCollection = collections[pathArray[0]]

  if (pathArray.length === 1) {
    const latestVersionedRequests = currentCollection.requests.filter(
      (req): req is HoppRESTRequest => req.v === RESTReqSchemaVersion
    )
    return latestVersionedRequests
  }

  for (let i = 1; i < pathArray.length; i++) {
    const folder = currentCollection.folders[pathArray[i]]
    if (folder) currentCollection = folder
  }

  const latestVersionedRequests = currentCollection.requests.filter(
    (req): req is HoppRESTRequest => req.v === RESTReqSchemaVersion
  )

  return latestVersionedRequests
}
