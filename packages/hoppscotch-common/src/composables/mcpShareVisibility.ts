import { computed } from "vue"

import { useSetting } from "~/composables/settings"

/**
 * Composable to determine MCP Share visibility based on the ENABLE_MCP_SHARE flag.
 */
export function useMcpShareVisibility() {
  const ENABLE_MCP_SHARE = useSetting("ENABLE_MCP_SHARE")

  const isMcpShareVisible = computed(() => ENABLE_MCP_SHARE.value)

  return {
    isMcpShareVisible,
  }
}
