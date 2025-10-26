import { computed } from "vue"
import { useReadonlyStream } from "~/composables/stream"
import { mockServers$ } from "~/newstore/mockServers"
import type { MockServer } from "~/newstore/mockServers"

/**
 * Composable to get mock server status for collections
 */
export function useMockServerStatus() {
  const mockServers = useReadonlyStream(mockServers$, [])

  /**
   * Get mock server for a specific collection
   */
  const getMockServerForCollection = (
    collectionId: string
  ): MockServer | null => {
    return (
      mockServers.value.find(
        (server) =>
          server.collection?.id === collectionId ||
          server.collectionID === collectionId
      ) || null
    )
  }

  /**
   * Check if a collection has an active mock server
   */
  const hasActiveMockServer = (collectionId: string): boolean => {
    const mockServer = getMockServerForCollection(collectionId)
    return mockServer?.isActive === true
  }

  /**
   * Check if a collection has any mock server (active or inactive)
   */
  const hasMockServer = (collectionId: string): boolean => {
    return getMockServerForCollection(collectionId) !== null
  }

  /**
   * Get mock server status for a collection
   */
  const getMockServerStatus = (collectionId: string) => {
    const mockServer = getMockServerForCollection(collectionId)

    if (!mockServer) {
      return {
        exists: false,
        isActive: false,
        mockServer: null,
      }
    }

    return {
      exists: true,
      isActive: mockServer.isActive,
      mockServer,
    }
  }

  return {
    mockServers: computed(() => mockServers.value),
    getMockServerForCollection,
    hasActiveMockServer,
    hasMockServer,
    getMockServerStatus,
  }
}
