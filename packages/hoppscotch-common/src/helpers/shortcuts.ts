import { getPlatformAlternateKey, getPlatformSpecialKey } from "./platformutils"

export type ShortcutDef = {
  label: string
  keys: string[]
  section: string
}

export function getShortcuts(t: (x: string) => string): ShortcutDef[] {
  // General
  return [
    {
      label: t("shortcut.general.help_menu"),
      keys: ["?"],
      section: t("shortcut.general.title"),
    },
    {
      label: t("shortcut.general.command_menu"),
      keys: ["/"],
      section: t("shortcut.general.title"),
    },
    {
      label: t("shortcut.general.show_all"),
      keys: [getPlatformSpecialKey(), "K"],
      section: t("shortcut.general.title"),
    },
    {
      label: t("shortcut.general.close_current_menu"),
      keys: ["ESC"],
      section: t("shortcut.general.title"),
    },

    // Request
    {
      label: t("shortcut.request.send_request"),
      keys: [getPlatformSpecialKey(), "↩"],
      section: t("shortcut.request.title"),
    },
    {
      keys: [getPlatformSpecialKey(), "S"],
      label: t("shortcut.request.save_to_collections"),
      section: t("shortcut.request.title"),
    },
    {
      keys: [getPlatformSpecialKey(), "U"],
      label: t("shortcut.request.copy_request_link"),
      section: t("shortcut.request.title"),
    },
    {
      keys: [getPlatformSpecialKey(), "I"],
      label: t("shortcut.request.reset_request"),
      section: t("shortcut.request.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "↑"],
      label: t("shortcut.request.next_method"),
      section: t("shortcut.request.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "↓"],
      label: t("shortcut.request.previous_method"),
      section: t("shortcut.request.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "G"],
      label: t("shortcut.request.get_method"),
      section: t("shortcut.request.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "H"],
      label: t("shortcut.request.head_method"),
      section: t("shortcut.request.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "P"],
      label: t("shortcut.request.post_method"),
      section: t("shortcut.request.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "U"],
      label: t("shortcut.request.put_method"),
      section: t("shortcut.request.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "X"],
      label: t("shortcut.request.delete_method"),
      section: t("shortcut.request.title"),
    },

    // Response
    {
      keys: [getPlatformSpecialKey(), "J"],
      label: t("shortcut.response.download"),
      section: t("shortcut.response.title"),
    },
    {
      keys: [getPlatformSpecialKey(), "."],
      label: t("shortcut.response.copy"),
      section: t("shortcut.response.title"),
    },

    // Navigation
    {
      keys: [getPlatformSpecialKey(), "←"],
      label: t("shortcut.navigation.back"),
      section: t("shortcut.navigation.title"),
    },
    {
      keys: [getPlatformSpecialKey(), "→"],
      label: t("shortcut.navigation.forward"),
      section: t("shortcut.navigation.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "R"],
      label: t("shortcut.navigation.rest"),
      section: t("shortcut.navigation.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "Q"],
      label: t("shortcut.navigation.graphql"),
      section: t("shortcut.navigation.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "W"],
      label: t("shortcut.navigation.realtime"),
      section: t("shortcut.navigation.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "S"],
      label: t("shortcut.navigation.settings"),
      section: t("shortcut.navigation.title"),
    },
    {
      keys: [getPlatformAlternateKey(), "M"],
      label: t("shortcut.navigation.profile"),
      section: t("shortcut.navigation.title"),
    },

    // Miscellaneous
    {
      keys: [getPlatformSpecialKey(), "M"],
      label: t("shortcut.miscellaneous.invite"),
      section: t("shortcut.miscellaneous.title"),
    },
  ]
}
