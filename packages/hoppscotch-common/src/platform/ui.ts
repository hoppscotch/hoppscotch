import { Ref, Component } from "vue"
import { getI18n } from "~/modules/i18n"

export type HoppFooterMenuItem = {
  id: string
  text: (t: ReturnType<typeof getI18n>) => string
  icon: Component
  action: { type: "link"; href: string } | { type: "custom"; do: () => void }
}

export type HoppSupportOptionsMenuItem = {
  id: string
  text: (t: ReturnType<typeof getI18n>) => string
  subtitle: (t: ReturnType<typeof getI18n>) => string
  icon: Component
  action: { type: "link"; href: string } | { type: "custom"; do: () => void }
}

export type UIPlatformDef = {
  appHeader?: {
    paddingTop?: Ref<string>
    paddingLeft?: Ref<string>

    /**
     * A function which is called when the header area of the app receives a click event
     */
    onHeaderAreaClick?: () => void
  }
  onCodemirrorInstanceMount?: (element: HTMLElement) => void

  /**
   * Additional menu items shown in the "Help and Feedback" menu
   * in the app footer.
   */
  additionalFooterMenuItems?: HoppFooterMenuItem[]

  /**
   * Additional Support Options menu items shown in the app header
   */
  additionalSupportOptionsMenuItems?: HoppSupportOptionsMenuItem[]

  /**
   * Additional Settings Section components in the settings page
   */
  additionalSettingsSections?: Component[]

  /**
   * Additional profile Section components in the profile page
   */
  additionalProfileSections?: Component[]

  /**
   * Custom history related components to be shown in the history page
   */
  additionalHistoryComponent?: Component

  /**
   * Custom sidebar header item to be shown in the sidebar header
   */
  additionalSidebarHeaderItem?: Component

  /**
   * Custom invite component to be shown in the team invite page
   */
  additionalTeamInviteComponent?: Component

  /**
   * Custom edit component to be shown in the team edit page
   */
  additionalTeamEditComponent?: Component

  /**
   * More info shown in the danger zone section while attempting user deletion
   * Sample use case includes displaying the instance information on cloud instances
   */
  additionalUserDeletionSoleTeamOwnerInfo?: Component

  /**
   * Customize embeds appearance at the platform level
   * Sample use case includes bringing embeds behind auth on sub domain based cloud instances
   */
  additionalEmbedsComponent?: Component
}
