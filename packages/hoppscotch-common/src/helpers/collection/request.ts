import { getTabsRefTo } from "../rest/tab"
import { getAffectedIndexes } from "./affectedIndex"

/**
 *
 * @param lastIndex
 * @param newIndex
 */

export function resolveSaveContextOnReorder(
  lastIndex: number,
  newIndex: number,
  folderPath: string
) {
  if (newIndex > lastIndex) newIndex-- // there is a issue when going down? better way to resolve this?
  if (lastIndex === newIndex) return

  const effectedIndexes = getAffectedIndexes(lastIndex, newIndex)

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
