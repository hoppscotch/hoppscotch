import { getDefaultRESTRequest } from "@hoppscotch/data"
import { ref, computed } from "vue"

import { HandleState } from "../../handle"
import { WorkspaceRequest } from "../../workspace"

export const generateIssuedHandleValues = (
  collectionsAndRequests: { collectionID: string; requestCount: number }[]
) => {
  const providerID = "PERSONAL_WORKSPACE_PROVIDER"
  const workspaceID = "personal"
  const issuedHandleValues: HandleState<WorkspaceRequest, unknown>[] = []

  collectionsAndRequests.forEach(({ collectionID, requestCount }) => {
    for (let i = 0; i < requestCount; i++) {
      const requestID = `${collectionID}/${i}`

      issuedHandleValues.push({
        type: "ok" as const,
        data: {
          providerID: providerID,
          workspaceID: workspaceID,
          collectionID,
          requestID,
          request: {
            ...getDefaultRESTRequest(),
            name: `req-${requestID}`,
          },
        },
      })
    }
  })

  return issuedHandleValues
}

export const getWritableHandle = (
  value: HandleState<WorkspaceRequest, unknown>
) => {
  const handleRefData = ref(value)

  const writableHandle = computed({
    get() {
      return handleRefData.value
    },
    set(newValue) {
      handleRefData.value = newValue
    },
  })

  return writableHandle
}
