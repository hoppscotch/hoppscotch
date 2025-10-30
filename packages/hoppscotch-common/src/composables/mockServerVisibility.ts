import { computed } from "vue"

import { useSetting } from "~/composables/settings"

/**
 * Composable to determine mock server visibility based on experimental flags
 */
export function useMockServerVisibility() {
  const ENABLE_EXPERIMENTAL_MOCK_SERVERS = useSetting(
    "ENABLE_EXPERIMENTAL_MOCK_SERVERS"
  )

  /**
   * Check if mock servers should be visible based on experimental flag
   */
  const isMockServerVisible = computed(
    () => ENABLE_EXPERIMENTAL_MOCK_SERVERS.value
  )

  return {
    isMockServerVisible,
  }
}
