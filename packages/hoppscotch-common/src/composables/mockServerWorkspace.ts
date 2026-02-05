import { useService } from "dioc/vue"
import { watch } from "vue"
import { loadMockServers, setMockServers } from "~/newstore/mockServers"
import { platform } from "~/platform"
import { WorkspaceService } from "~/services/workspace.service"
import { useMockServerVisibility } from "./mockServerVisibility"
import { useReadonlyStream } from "./stream"

/**
 * Composable to handle mock server state when workspace changes
 * This ensures mock servers are cleared immediately when switching workspaces
 * to prevent showing stale data from the previous workspace
 */
export function useMockServerWorkspaceSync() {
  const workspaceService = useService(WorkspaceService)
  const { isMockServerVisible } = useMockServerVisibility()

  const currentUser = useReadonlyStream(
    platform.auth.getCurrentUserStream(),
    platform.auth.getCurrentUser()
  )

  const loadServers = () => {
    if (!currentUser.value || !isMockServerVisible.value) return
    loadMockServers().catch(() => setMockServers([]))
  }

  // Load mock servers when authentication or visibility changes
  watch([currentUser, isMockServerVisible], loadServers, {
    immediate: true,
  })

  // Watch for workspace changes and clear mock servers immediately
  watch(
    () => workspaceService.currentWorkspace.value,
    (newWorkspace, oldWorkspace) => {
      if (!currentUser.value || !isMockServerVisible.value) return

      // Clear mock servers when workspace changes to prevent stale data
      if (
        newWorkspace?.type !== oldWorkspace?.type ||
        (newWorkspace?.type === "team" &&
          oldWorkspace?.type === "team" &&
          newWorkspace.teamID !== oldWorkspace.teamID)
      ) {
        setMockServers([])
        loadServers()
      }
    },
    { deep: true }
  )
}
