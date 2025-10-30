import { onMounted, watch } from "vue"
import { useService } from "dioc/vue"
import { WorkspaceService } from "~/services/workspace.service"
import { setMockServers, loadMockServers } from "~/newstore/mockServers"
import { platform } from "~/platform"
import { useMockServerVisibility } from "./mockServerVisibility"

/**
 * Composable to handle mock server state when workspace changes
 * This ensures mock servers are cleared immediately when switching workspaces
 * to prevent showing stale data from the previous workspace
 */
export function useMockServerWorkspaceSync() {
  const workspaceService = useService(WorkspaceService)
  const { isMockServerVisible } = useMockServerVisibility()
  const isAuthenticated = !!platform.auth.getCurrentUser()

  // Initial load of mock servers for the current workspace
  onMounted(() => {
    if (!isAuthenticated || !isMockServerVisible.value) return
    loadMockServers().catch(() => setMockServers([]))
  })

  // Watch for workspace changes and clear mock servers immediately
  watch(
    () => workspaceService.currentWorkspace.value,
    (newWorkspace, oldWorkspace) => {
      if (!isAuthenticated || !isMockServerVisible.value) return

      // Clear mock servers when workspace changes to prevent stale data
      if (
        newWorkspace?.type !== oldWorkspace?.type ||
        (newWorkspace?.type === "team" &&
          oldWorkspace?.type === "team" &&
          newWorkspace.teamID !== oldWorkspace.teamID)
      ) {
        // Clear mock servers immediately to prevent showing stale data
        setMockServers([])

        // If user is authenticated, reload mock servers for the new workspace
        if (platform.auth.getCurrentUser()) {
          // fire-and-forget; loadMockServers handles errors internally
          loadMockServers().catch(() => setMockServers([]))
        }
      }
    },
    { deep: true, immediate: false }
  )
}
