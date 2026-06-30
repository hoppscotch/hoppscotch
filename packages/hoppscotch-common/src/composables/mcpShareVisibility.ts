import { computed } from "vue"

/**
 * Composable to determine MCP Share visibility. Forced ON for the internal demo —
 * revert to `useSetting("ENABLE_MCP_SHARE")` before any user-facing release.
 */
export function useMcpShareVisibility() {
  const isMcpShareVisible = computed(() => true)

  return {
    isMcpShareVisible,
  }
}
