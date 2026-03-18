import { computed } from "vue"

import { useSetting } from "~/composables/settings"

/**
 * Composable to determine documentation visibility based on experimental flags
 */
export function useDocumentationVisibility() {
  const ENABLE_EXPERIMENTAL_DOCUMENTATION = useSetting(
    "ENABLE_EXPERIMENTAL_DOCUMENTATION"
  )

  /**
   * Check if documentation should be visible based on experimental flag
   */
  const isDocumentationVisible = computed(
    () => ENABLE_EXPERIMENTAL_DOCUMENTATION.value
  )

  return {
    isDocumentationVisible,
  }
}
