import type { Component } from "vue"

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
   * Custom component for the organization switcher dropdown
   * If provided, will be shown as a dropdown in the header (like the instance switcher)
   * The component should emit 'close-dropdown' when the dropdown should close
   */
  customOrganizationSwitcherComponent?: Component

  /**
   * Switch to a specific organization instance or default cloud instance
   * For web: redirects to the target URL
   * For desktop: loads the organization bundle and connects
   * @param orgDomain - The organization domain (null for default cloud instance)
   */
  switchToInstance?: (orgDomain: string | null) => void | Promise<void>
}
