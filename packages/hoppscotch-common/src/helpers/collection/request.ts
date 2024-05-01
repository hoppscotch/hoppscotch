import {
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"

import { getService } from "~/modules/dioc"
import { HandleRef } from "~/services/new-workspace/handle"
import { WorkspaceRequest } from "~/services/new-workspace/workspace"
import { RESTTabService } from "~/services/tab/rest"
import { getAffectedIndexes } from "./affectedIndex"

/**
 * Resolve save context on reorder
 * @param payload
 * @param payload.lastIndex
 * @param payload.newIndex
 * @param payload.folderPath
 * @param payload.length
 * @returns
 */

export function resolveSaveContextOnRequestReorder(payload: {
  lastIndex: number
  folderPath: string
  newIndex: number
  length?: number // better way to do this? now it could be undefined
}) {
  const { lastIndex, folderPath, length } = payload
  let { newIndex } = payload

  if (newIndex > lastIndex) newIndex-- // there is a issue when going down? better way to resolve this?
  if (lastIndex === newIndex) return

  const affectedIndices = getAffectedIndexes(
    lastIndex,
    newIndex === -1 ? length! : newIndex
  )

  // if (newIndex === -1) remove it from the map because it will be deleted
  if (newIndex === -1) affectedIndices.delete(lastIndex)

  const tabService = getService(RESTTabService)
  const tabs = tabService.getTabsRefTo((tab) => {
    if (tab.document.saveContext?.originLocation === "user-collection") {
      return (
        tab.document.saveContext.folderPath === folderPath &&
        affectedIndices.has(tab.document.saveContext.requestIndex)
      )
    }

    if (
      tab.document.saveContext?.originLocation !== "workspace-user-collection"
    ) {
      return false
    }

    const requestHandle = tab.document.saveContext.requestHandle as
      | HandleRef<WorkspaceRequest>["value"]
      | undefined

    if (!requestHandle || requestHandle.type === "invalid") {
      return false
    }

    const { requestID } = requestHandle.data
    const collectionID = requestID.split("/").slice(0, -1).join("/")
    const requestIndex = parseInt(requestID.split("/").slice(-1)[0])

    return collectionID === folderPath && affectedIndices.has(requestIndex)
  })

  for (const tab of tabs) {
    if (tab.value.document.saveContext?.originLocation === "user-collection") {
      const newIndex = affectedIndices.get(
        tab.value.document.saveContext?.requestIndex
      )!
      tab.value.document.saveContext.requestIndex = newIndex
    }

    if (
      tab.value.document.saveContext?.originLocation !==
      "workspace-user-collection"
    ) {
      return
    }

    const requestHandle = tab.value.document.saveContext.requestHandle as
      | HandleRef<WorkspaceRequest>["value"]
      | undefined

    if (!requestHandle || requestHandle.type === "invalid") {
      return
    }

    const { requestID } = requestHandle.data

    const requestIDArr = requestID.split("/")
    const requestIndex = affectedIndices.get(
      parseInt(requestIDArr[requestIDArr.length - 1])
    )!

    requestIDArr[requestIDArr.length - 1] = requestIndex.toString()

    requestHandle.data.requestID = requestIDArr.join("/")
    requestHandle.data.collectionID = requestIDArr.slice(0, -1).join("/")
  }
}

export function getRequestsByPath(
  collections: HoppCollection[],
  path: string
): HoppRESTRequest[] | HoppGQLRequest[] {
  // path will be like this "0/0/1" these are the indexes of the folders
  const pathArray = path.split("/").map((index) => parseInt(index))

  let currentCollection = collections[pathArray[0]]

  if (pathArray.length === 1) {
    const latestVersionedRequests = currentCollection.requests.filter(
      (req): req is HoppRESTRequest => req.v === "3"
    )

    return latestVersionedRequests
  }
  for (let i = 1; i < pathArray.length; i++) {
    const folder = currentCollection.folders[pathArray[i]]
    if (folder) currentCollection = folder
  }

  const latestVersionedRequests = currentCollection.requests.filter(
    (req): req is HoppRESTRequest => req.v === "3"
  )

  return latestVersionedRequests
}
