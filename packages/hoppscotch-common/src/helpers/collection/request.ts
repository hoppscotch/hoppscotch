import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { getTabsRefTo } from "../rest/tab"
import { getAffectedIndexes } from "./affectedIndex"

/**
 * Resolve save context on reorder
 * @param payload
 * @param payload.lastIndex
 * @param payload.newIndex
 * @param payload.folderPath
 * @param payload.totalRequests
 * @returns
 */

export function resolveSaveContextOnReorder(payload: {
  lastIndex: number
  folderPath: string
  newIndex: number
  totalRequests?: number // better way to do this? now it could be undefined
}) {
  let { lastIndex, newIndex, folderPath } = payload

  if (newIndex > lastIndex) newIndex-- // there is a issue when going down? better way to resolve this?
  if (lastIndex === newIndex) return

  const effectedIndexes = getAffectedIndexes(
    lastIndex,
    newIndex === -1 ? payload.totalRequests! : newIndex
  )

  // if (newIndex === -1) remove it from the map because it will be deleted
  if (newIndex === -1) effectedIndexes.delete(lastIndex)

  const tabs = getTabsRefTo((tab) => {
    return (
      tab.document.saveContext?.originLocation === "user-collection" &&
      tab.document.saveContext.folderPath === folderPath &&
      effectedIndexes.has(tab.document.saveContext.requestIndex)
    )
  })

  for (const tab of tabs) {
    if (tab.value.document.saveContext?.originLocation === "user-collection") {
      const newIndex = effectedIndexes.get(
        tab.value.document.saveContext?.requestIndex
      )!
      tab.value.document.saveContext.requestIndex = newIndex
    }
  }
}

export function getRequestsByPath(
  collections: HoppCollection<HoppRESTRequest>[],
  path: string
): HoppRESTRequest[] {
  // path will be like this "0/0/1" these are the indexes of the folders
  const pathArray = path.split("/").map((index) => parseInt(index))

  let currentCollection = collections[pathArray[0]]

  if (pathArray.length === 1) {
    return currentCollection.requests
  } else {
    for (let i = 1; i < pathArray.length; i++) {
      const folder = currentCollection.folders[pathArray[i]]
      if (folder) currentCollection = folder
    }
  }

  return currentCollection.requests
}
