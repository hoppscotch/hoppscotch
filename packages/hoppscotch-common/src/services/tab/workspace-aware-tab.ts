import { Workspace } from "../workspace.service"

/**
 * Generates a workspace-scoped storage key for tab state
 * @param baseKey The base key (e.g., 'REST_TABS', 'GQL_TABS')
 * @param workspace The workspace object
 * @returns A workspace-scoped key
 */
export function getWorkspaceScopedTabKey(
  baseKey: string,
  workspace: Workspace
): string {
  if (workspace.type === "personal") {
    return `${baseKey}_PERSONAL`
  }
  return `${baseKey}_TEAM_${workspace.teamID}`
}