import type { Component } from "vue"
import type { GQLError } from "~/helpers/backend/GQLClient"

export type OrganizationPlatformDef = {
  isDefaultCloudInstance: boolean
  getOrgInfo: () => Promise<{
    orgID: string
    orgDomain: string
    name?: string
    logo?: string | null
    isAdmin: boolean
  } | null>
  getRootDomain: () => string
  initiateOnboarding: () => void

  /**
   * Custom component for the organization switcher dropdown.
   * If provided, organization switching is considered enabled and the component
   * will be rendered in the unified header dropdown alongside the instance switcher.
   * The component should emit 'close-dropdown' when the dropdown should close.
   */
  customOrganizationSwitcherComponent?: Component

  /**
   * Switch to a specific organization instance or default cloud instance
   * For web: redirects to the target URL
   * For desktop: loads the organization bundle and connects
   * @param orgDomain - The organization domain (null for default cloud instance)
   */
  switchToInstance?: (orgDomain: string | null) => void | Promise<void>

  /**
   * Called before the create workspace flow opens. Return `false` to stop it,
   * e.g. when the platform shows its own UI instead.
   */
  beforeCreateTeam?: () => boolean

  /**
   * Return `true` for a team workspace error the platform shows its own UI
   * for. Team data loaders then stay empty instead of failing.
   */
  isExpectedTeamError?: (error: GQLError<string>) => boolean

  /**
   * A message for a team workspace error that only this platform's backend
   * sends. Team actions show it in place of a generic one.
   */
  describeTeamError?: (error: GQLError<string>) => string | undefined
}
