import { computed } from "vue"
import { useSetting } from "~/composables/settings"
import { platform } from "~/platform"
import { useService } from "dioc/vue"
import { WorkspaceService } from "~/services/workspace.service"

/**
 * Composable to determine mock server visibility based on experimental flags and platform configuration
 */
export function useMockServerVisibility() {
  const ENABLE_EXPERIMENTAL_MOCK_SERVERS = useSetting(
    "ENABLE_EXPERIMENTAL_MOCK_SERVERS"
  )

  const workspaceService = useService(WorkspaceService)

  /**
   * Check if mock servers should be visible based on experimental flag and platform configuration
   */
  const isMockServerVisible = computed(() => {
    // First check if experimental mock servers are enabled
    if (!ENABLE_EXPERIMENTAL_MOCK_SERVERS.value) {
      return false
    }

    // Check if platform disables mock servers in personal workspaces
    const disableInPersonalWorkspace =
      platform.platformFeatureFlags.disableMockServerInPersonalWorkspace ??
      false

    // If platform disables mock servers in personal workspaces and current workspace is personal, hide mock servers
    if (
      disableInPersonalWorkspace &&
      workspaceService.currentWorkspace.value.type === "personal"
    ) {
      return false
    }

    return true
  })

  return {
    isMockServerVisible,
  }
}
