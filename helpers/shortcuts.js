import { getPlatformAlternateKey, getPlatformSpecialKey } from "./platformutils"

export default [
  {
    section: "General",
    shortcuts: [
      {
        keys: ["?"],
        label: "shortcut.general.help_menu",
      },
      {
        keys: ["/"],
        label: "shortcut.general.command_menu",
      },
      {
        keys: [getPlatformSpecialKey(), "K"],
        label: "shortcut.general.show_all",
      },
      {
        keys: ["Esc"],
        label: "shortcut.general.close_current_menu",
      },
    ],
  },
  {
    section: "Request",
    shortcuts: [
      {
        keys: [getPlatformSpecialKey(), "G"],
        label: "shortcut.send_request",
      },
      {
        keys: [getPlatformSpecialKey(), "S"],
        label: "shortcut.save_to_collections",
      },
      {
        keys: [getPlatformSpecialKey(), "C"],
        label: "shortcut.copy_request_link",
      },
      {
        keys: [getPlatformSpecialKey(), "I"],
        label: "shortcut.reset_request",
      },
      {
        keys: [getPlatformAlternateKey(), "↑"],
        label: "shortcut.next_method",
      },
      {
        keys: [getPlatformAlternateKey(), "↓"],
        label: "shortcut.previous_method",
      },
      {
        keys: [getPlatformAlternateKey(), "G"],
        label: "shortcut.get_method",
      },
      {
        keys: [getPlatformAlternateKey(), "H"],
        label: "shortcut.head_method",
      },
      {
        keys: [getPlatformAlternateKey(), "P"],
        label: "shortcut.post_method",
      },
      {
        keys: [getPlatformAlternateKey(), "U"],
        label: "shortcut.put_method",
      },
      {
        keys: [getPlatformAlternateKey(), "X"],
        label: "shortcut.delete_method",
      },
    ],
  },
]

export const spotlight = [
  {
    section: "Spotlight",
    shortcuts: [
      {
        keys: ["?"],
        label: "shortcut.general.help_menu",
        action: "modals.support.toggle",
        icon: "support",
      },
      {
        keys: [getPlatformSpecialKey(), "K"],
        label: "shortcut.general.show_all",
        action: "flyouts.keybinds.toggle",
        icon: "keyboard",
      },
    ],
  },
  {
    section: "Navigation",
    shortcuts: [
      {
        keys: [getPlatformAlternateKey(), "R"],
        label: "shortcut.navigation.rest",
        action: "navigation.rest.jump",
        icon: "arrow_forward",
      },
      {
        keys: [getPlatformAlternateKey(), "Q"],
        label: "shortcut.navigation.graphql",
        action: "navigation.graphql.jump",
        icon: "arrow_forward",
      },
      {
        keys: [getPlatformAlternateKey(), "W"],
        label: "shortcut.navigation.realtime",
        action: "navigation.realtime.jump",
        icon: "arrow_forward",
      },
      {
        keys: [getPlatformAlternateKey(), "D"],
        label: "shortcut.navigation.documentation",
        action: "navigation.documentation.jump",
        icon: "arrow_forward",
      },
      {
        keys: [getPlatformAlternateKey(), "S"],
        label: "shortcut.navigation.settings",
        action: "navigation.settings.jump",
        icon: "arrow_forward",
      },
    ],
  },
]
