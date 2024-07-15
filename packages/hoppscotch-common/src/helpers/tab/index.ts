import { getService } from "~/modules/dioc"

import { PersonalWorkspaceProviderService } from "~/services/new-workspace/providers/personal.workspace"
import { HoppTab } from "~/services/tab"
import { HoppRESTDocument } from "../rest/document"

const personalWorkspaceProviderService = getService(
  PersonalWorkspaceProviderService
)

/**
 * Remove the request handle corresponding to the tab being closed from the issued handles list under `PersonalWorkspaceProviderService`
 *
 * @param tabState The tab being closed
 * @param action The action to be performed on the request handle corresponding to the incoming tab in the issued handles list
 * @returns {void}
 */

export const updateIssuedHandlesForPersonalWorkspace = (
  tabState: HoppTab<HoppRESTDocument>,
  action: "include" | "exclude"
) => {
  const { saveContext } = tabState.document

  if (!saveContext) {
    // Closing all the tabs except the one not under a collection will require clearing the issued handles list
    if (action === "include") {
      personalWorkspaceProviderService.setIssuedHandles([])
    }

    return
  }

  if (
    saveContext.originLocation !== "workspace-user-collection" ||
    !saveContext.requestHandle
  ) {
    return
  }

  const requestHandleRef = saveContext.requestHandle.get()

  if (requestHandleRef.value.type === "ok") {
    const requestHandleData = requestHandleRef.value.data

    // `exclude` indicates closing a tab, removing the request handle from the issued handles list
    if (action === "exclude") {
      personalWorkspaceProviderService.setIssuedHandles(
        personalWorkspaceProviderService.issuedHandles.filter(
          (handle) =>
            !(
              handle.value.type === "ok" &&
              "requestID" in handle.value.data &&
              handle.value.data.requestID === requestHandleData.requestID
            )
        )
      )

      return
    }

    // `include` indicates closing the tabs other than the one corresponding to the incoming `tabState`, setting the request handle in the issued handles list
    const handle = personalWorkspaceProviderService.issuedHandles.find(
      (handle) => {
        return (
          handle.value.type === "ok" &&
          "requestID" in handle.value.data &&
          handle.value.data.requestID === requestHandleData.requestID
        )
      }
    )

    if (!handle) {
      return
    }

    personalWorkspaceProviderService.setIssuedHandles([handle])
  }
}
