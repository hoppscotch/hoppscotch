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
   * Whether organization switching is enabled for this platform
   * If true, an organization switcher will be shown
   */
  organizationSwitchingEnabled?: boolean

  /**
   * Custom component for the organization sidebar
   * If provided, will be shown as a sidebar in the layout
   */
  customOrganizationSidebarComponent?: Component

  /**
   * Switch to a specific organization instance or default cloud instance
   * For web: redirects to the target URL
   * For desktop: loads the organization bundle and connects
   * @param orgDomain - The organization domain (null for default cloud instance)
   */
  switchToInstance?: (orgDomain: string | null) => void | Promise<void>
}
