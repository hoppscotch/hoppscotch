import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { getTabsRefTo } from "../rest/tab"
import { getAffectedIndexes } from "./affectedIndex"

/**
 * Resolve save context on reorder
 * @param payload
 * @param payload.lastIndex
 * @param payload.newIndex
 * @param folderPath
 * @param payload.length
 * @returns
 */

export function resolveSaveContextOnCollectionReorder(payload: {
  lastIndex: number
  newIndex: number
  folderPath: string
  length?: number // better way to do this? now it could be undefined
}) {
  let { lastIndex, newIndex, folderPath, length } = payload

  if (newIndex > lastIndex) newIndex-- // there is a issue when going down? better way to resolve this?
  if (lastIndex === newIndex) return

  const affectedIndexes = getAffectedIndexes(
    lastIndex,
    newIndex === -1 ? length! : newIndex
  )

  // if (newIndex === -1) remove it from the map because it will be deleted
  if (newIndex === -1) affectedIndexes.delete(lastIndex)

  // add folder path as prefix to the affected indexes
  const affectedPaths = new Map<string, string>()
  for (const [key, value] of affectedIndexes) {
    if (folderPath) {
      affectedPaths.set(`${folderPath}/${key}`, `${folderPath}/${value}`)
    } else {
      affectedPaths.set(key.toString(), value.toString())
    }
  }

  const tabs = getTabsRefTo((tab) => {
    return (
      tab.document.saveContext?.originLocation === "user-collection" &&
      affectedPaths.has(tab.document.saveContext.folderPath)
    )
  })

  for (const tab of tabs) {
    if (tab.value.document.saveContext?.originLocation === "user-collection") {
      const newPath = affectedPaths.get(
        tab.value.document.saveContext?.folderPath
      )!
      tab.value.document.saveContext.folderPath = newPath
    }
  }
}

export function getFoldersByPath(
  collections: HoppCollection<HoppRESTRequest>[],
  path: string
): HoppCollection<HoppRESTRequest>[] {
  // path will be like this "0/0/1" these are the indexes of the folders
  const pathArray = path.split("/").map((index) => parseInt(index))

  let currentCollection = collections[pathArray[0]]

  if (pathArray.length === 1) {
    return currentCollection.folders
  } else {
    for (let i = 1; i < pathArray.length; i++) {
      const folder = currentCollection.folders[pathArray[i]]
      if (folder) currentCollection = folder
    }
  }

  return currentCollection.folders
}
