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
  }
  onCodemirrorInstanceMount?: (element: HTMLElement) => void

  /**
   * Additonal menu items shown in the "Help and Feedback" menu
   * in the app footer.
   */
  additionalFooterMenuItems?: HoppFooterMenuItem[]

  /**
   * Additional Support Options menu items shown in the app header
   */
  additionalSupportOptionsMenuItems?: HoppSupportOptionsMenuItem[]
}
