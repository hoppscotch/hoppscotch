import { HoppCollection } from "@hoppscotch/data"
import { getAffectedIndexes } from "./affectedIndex"
import { GetSingleRequestDocument } from "../backend/graphql"
import { runGQLQuery } from "../backend/GQLClient"
import * as E from "fp-ts/Either"
import { getService } from "~/modules/dioc"
import { RESTTabService } from "~/services/tab/rest"
import { GQLTabService } from "~/services/tab/graphql"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { cascadeParentCollectionForProperties } from "~/newstore/collections"

/**
 * Resolve save context on reorder
 */
export function resolveSaveContextOnCollectionReorder(
  payload: {
    lastIndex: number
    newIndex: number
    folderPath: string
    length?: number // better way to do this? now it could be undefined
  },
  type: "remove" | "drop" = "remove"
) {
  const { lastIndex, folderPath, length } = payload
  let { newIndex } = payload

  if (newIndex > lastIndex) newIndex-- // there is a issue when going down? better way to resolve this?
  if (lastIndex === newIndex) return

  const affectedIndexes = getAffectedIndexes(
    lastIndex,
    newIndex === -1 ? length! : newIndex
  )

  if (newIndex === -1) {
    // if (newIndex === -1) remove it from the map because it will be deleted
    affectedIndexes.delete(lastIndex)
    // when collection deleted opened requests from that collection be affected
    if (type === "remove") {
      resetSaveContextForAffectedRequests(
        folderPath ? `${folderPath}/${lastIndex}` : lastIndex.toString()
      )
    }
  }

  // add folder path as prefix to the affected indexes
  const affectedPaths = new Map<string, string>()
  for (const [key, value] of affectedIndexes) {
    if (folderPath) {
      affectedPaths.set(`${folderPath}/${key}`, `${folderPath}/${value}`)
    } else {
      affectedPaths.set(key.toString(), value.toString())
    }
  }

  const tabService = getService(RESTTabService)

  const tabs = tabService.getTabsRefTo((tab) => {
    if (tab.document.type === "test-runner") return false
    return (
      tab.document.saveContext?.originLocation === "user-collection" &&
      affectedPaths.has(tab.document.saveContext.folderPath)
    )
  })

  for (const tab of tabs) {
    if (
      tab.value.document.type !== "test-runner" &&
      tab.value.document.saveContext?.originLocation === "user-collection"
    ) {
      const newPath = affectedPaths.get(
        tab.value.document.saveContext.folderPath
      )!
      tab.value.document.saveContext.folderPath = newPath
    }
  }
}

/**
 * Helper to transform team collection IDs when folders move and trim leading slashes.
 * @param currentID Current collection ID
 * @param oldPath Old collection path
 * @param newPath New collection path
 * @returns Updated collection ID
 */
const updateCollectionIDPath = (
  currentID: string | undefined,
  oldPath: string,
  newPath: string | null
): string | undefined => {
  if (!currentID) return currentID
  const replaced = currentID.replace(oldPath, newPath ?? "")
  return replaced.replace(/^\/+/, "")
}

/**
 * Returns the last folder path from the given path.
 *  * @param path Path can be folder path or collection path
 * @returns Get the last folder path from the given path
 */
const getLastParentFolderPath = (path?: string) => {
  if (!path) return ""
  const pathArray = path.split("/")
  return pathArray[pathArray.length - 1] ?? ""
}

/**
 * Resolve save context for affected requests on drop folder
 * @param oldFolderPath Old folder path
 * @param newFolderPath New folder path
 */
export function updateSaveContextForAffectedRequests(
  oldFolderPath: string,
  newFolderPath: string | null
) {
  const tabService = getService(RESTTabService)
  const tabs = tabService.getTabsRefTo((tab) => {
    if (tab.document.type === "test-runner") return false

    return tab.document.saveContext?.originLocation === "user-collection"
      ? tab.document.saveContext.folderPath.startsWith(oldFolderPath)
      : tab.document.saveContext?.originLocation === "team-collection"
        ? tab.document.saveContext.collectionID!.startsWith(oldFolderPath) ||
          tab.document.saveContext.collectionID === oldFolderPath
        : false
  })

  for (const tab of tabs) {
    if (tab.value.document.type === "test-runner") return

    if (
      tab.value.document.saveContext?.originLocation === "user-collection" &&
      newFolderPath
    ) {
      tab.value.document.saveContext = {
        ...tab.value.document.saveContext,
        folderPath: tab.value.document.saveContext.folderPath.replace(
          oldFolderPath,
          newFolderPath
        ),
      }
    } else if (
      tab.value.document.saveContext?.originLocation === "team-collection"
    ) {
      tab.value.document.saveContext = {
        ...tab.value.document.saveContext,
        collectionID: updateCollectionIDPath(
          tab.value.document.saveContext.collectionID,
          oldFolderPath,
          newFolderPath
        ),
      }
    }
  }
}

export function updateInheritedPropertiesForAffectedRequests(
  path: string,
  type: "rest" | "graphql"
) {
  const tabService =
    type === "rest" ? getService(RESTTabService) : getService(GQLTabService)
  const teamCollectionService = getService(TeamCollectionsService)

  const effectedTabs = tabService.getTabsRefTo((tab) => {
    if ("type" in tab.document && tab.document.type === "test-runner")
      return false
    const saveContext = tab.document.saveContext

    const saveContextPath =
      saveContext?.originLocation === "team-collection"
        ? saveContext.collectionID
        : saveContext?.folderPath

    return (
      (saveContextPath?.startsWith(path) ||
        getLastParentFolderPath(saveContextPath) ===
          getLastParentFolderPath(path)) ??
      false
    )
  })

  effectedTabs.forEach((tab) => {
    if (
      "type" in tab.value.document &&
      tab.value.document.type === "test-runner"
    )
      return
    if (!("inheritedProperties" in tab.value.document)) return

    if (
      tab.value.document.saveContext?.originLocation === "team-collection" &&
      tab.value.document.inheritedProperties
    ) {
      tab.value.document.inheritedProperties =
        teamCollectionService.cascadeParentCollectionForProperties(
          tab.value.document.saveContext.collectionID!
        )
    }

    if (
      tab.value.document.saveContext?.originLocation === "user-collection" &&
      tab.value.document.inheritedProperties
    ) {
      tab.value.document.inheritedProperties =
        cascadeParentCollectionForProperties(
          tab.value.document.saveContext.folderPath,
          type
        )
    }
  })
}

function resetSaveContextForAffectedRequests(folderPath: string) {
  const tabService = getService(RESTTabService)
  const tabs = tabService.getTabsRefTo((tab) => {
    if (tab.document.type === "test-runner") return false
    return (
      tab.document.saveContext?.originLocation === "user-collection" &&
      tab.document.saveContext.folderPath.startsWith(folderPath)
    )
  })

  for (const tab of tabs) {
    if (tab.value.document.type === "test-runner") return
    tab.value.document.saveContext = null
    tab.value.document.isDirty = true

    if (tab.value.document.type === "request") {
      // since the request is deleted, we need to remove the saved responses as well
      tab.value.document.request.responses = {}
    }
  }
}

/**
 * Reset save context to null if requests are deleted from the team collection or its folder
 * only runs when collection or folder is deleted
 */
export async function resetTeamRequestsContext() {
  const tabService = getService(RESTTabService)
  const tabs = tabService.getTabsRefTo((tab) => {
    if (tab.document.type === "test-runner") return false
    return tab.document.saveContext?.originLocation === "team-collection"
  })

  for (const tab of tabs) {
    if (tab.value.document.type === "test-runner") return
    if (tab.value.document.saveContext?.originLocation === "team-collection") {
      const data = await runGQLQuery({
        query: GetSingleRequestDocument,
        variables: { requestID: tab.value.document.saveContext.requestID },
      })

      if (E.isRight(data) && data.right.request === null) {
        tab.value.document.saveContext = null
        tab.value.document.isDirty = true

        if (tab.value.document.type === "request") {
          // since the request is deleted, we need to remove the saved responses as well
          tab.value.document.request.responses = {}
        }
      }
    }
  }
}

export function getFoldersByPath(
  collections: HoppCollection[],
  path: string
): HoppCollection[] {
  if (!path) return collections

  // path will be like this "0/0/1" these are the indexes of the folders
  const pathArray = path.split("/").map((index) => parseInt(index))
  let currentCollection = collections[pathArray[0]]

  if (pathArray.length === 1) {
    return currentCollection.folders
  }

  for (let i = 1; i < pathArray.length; i++) {
    const folder = currentCollection.folders[pathArray[i]]
    if (folder) currentCollection = folder
  }

  return currentCollection.folders
}

/**
 * Transforms a collection to the format expected by team or personal collections.
 * Extracts auth, headers, and variables into a data object and recursively processes folders.
 * @param collection The collection to transform
 * @returns The transformed collection
 */
export function transformCollectionForImport(collection: any): any {
  const folders: any[] = (collection.folders ?? []).map(
    transformCollectionForImport
  )

  const data = {
    auth: collection.auth,
    headers: collection.headers,
    variables: collection.variables,
  }

  const obj = {
    ...collection,
    folders,
    data,
  }

  if (collection.id) obj.id = collection.id

  return obj
}
