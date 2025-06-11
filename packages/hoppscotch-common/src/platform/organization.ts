export type OrganizationPlatformDef = {
  isDefaultCloudInstance: boolean
  getOrgInfo: () => Promise<{
    orgID: string
    orgDomain: string
    isAdmin: boolean
  } | null>
  getRootDomain: () => string
  initiateOnboarding: () => void
}
