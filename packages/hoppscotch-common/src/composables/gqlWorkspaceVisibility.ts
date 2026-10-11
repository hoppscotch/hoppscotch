import { computed } from "vue"

import { useSetting } from "~/composables/settings"

/**
 * Composable that exposes whether GraphQL is hosted inside the unified REST
 * workspace, based on the `ENABLE_GQL_IN_REST_WORKSPACE` experimental flag.
 *
 * When enabled, GraphQL requests open as `gql-request` tabs in the REST
 * workspace and the protocol switcher is available. When disabled, GraphQL
 * stays on the standalone /graphql page.
 */
export function useGqlWorkspaceVisibility() {
  const ENABLE_GQL_IN_REST_WORKSPACE = useSetting(
    "ENABLE_GQL_IN_REST_WORKSPACE"
  )

  const isGqlWorkspaceEnabled = computed(
    () => ENABLE_GQL_IN_REST_WORKSPACE.value
  )

  return {
    isGqlWorkspaceEnabled,
  }
}
