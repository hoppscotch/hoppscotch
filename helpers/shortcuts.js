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
  {
    section: "Navigation",
    shortcuts: [
      {
        keys: [getPlatformSpecialKey(), "←"],
        label: "shortcut.navigation.back",
      },
      {
        keys: [getPlatformSpecialKey(), "→"],
        label: "shortcut.navigation.forward",
      },
      {
        keys: [getPlatformAlternateKey(), "R"],
        label: "shortcut.navigation.rest",
      },
      {
        keys: [getPlatformAlternateKey(), "Q"],
        label: "shortcut.navigation.graphql",
      },
      {
        keys: [getPlatformAlternateKey(), "W"],
        label: "shortcut.navigation.realtime",
      },
      {
        keys: [getPlatformAlternateKey(), "D"],
        label: "shortcut.navigation.documentation",
      },
      {
        keys: [getPlatformAlternateKey(), "S"],
        label: "shortcut.navigation.settings",
      },
    ],
  },
  {
    section: "Miscellaneous",
    shortcuts: [
      {
        keys: [getPlatformSpecialKey(), "M"],
        label: "shortcut.miscellaneous.invite",
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
        keywords: [
          "help",
          "support",
          "documentation",
          "troubleshooting",
          "chat",
          "community",
          "feedback",
          "report",
          "bug",
          "issue",
          "ticket",
        ],
      },
      {
        keys: [getPlatformSpecialKey(), "K"],
        label: "shortcut.general.show_all",
        action: "flyouts.keybinds.toggle",
        icon: "keyboard",
        keywords: ["keyboard", "shortcuts"],
      },
    ],
  },
  {
    section: "Navigation",
    shortcuts: [
      {
        keys: [getPlatformSpecialKey(), "←"],
        label: "shortcut.navigation.back",
        action: "navigation.jump.back",
        icon: "arrow_forward",
        keywords: ["back", "jump", "page", "navigation", "go"],
      },
      {
        keys: [getPlatformSpecialKey(), "→"],
        label: "shortcut.navigation.forward",
        action: "navigation.jump.forward",
        icon: "arrow_forward",
        keywords: ["forward", "jump", "page", "navigation", "go"],
      },
      {
        keys: [getPlatformAlternateKey(), "R"],
        label: "shortcut.navigation.rest",
        action: "navigation.jump.rest",
        icon: "arrow_forward",
        keywords: ["rest", "jump", "page", "navigation", "go"],
      },
      {
        keys: [getPlatformAlternateKey(), "Q"],
        label: "shortcut.navigation.graphql",
        action: "navigation.jump.graphql",
        icon: "arrow_forward",
        keywords: ["graphql", "jump", "page", "navigation", "go"],
      },
      {
        keys: [getPlatformAlternateKey(), "W"],
        label: "shortcut.navigation.realtime",
        action: "navigation.jump.realtime",
        icon: "arrow_forward",
        keywords: [
          "realtime",
          "jump",
          "page",
          "navigation",
          "websocket",
          "socket",
          "mqtt",
          "sse",
          "go",
        ],
      },
      {
        keys: [getPlatformAlternateKey(), "D"],
        label: "shortcut.navigation.documentation",
        action: "navigation.jump.documentation",
        icon: "arrow_forward",
        keywords: ["documentation", "jump", "page", "navigation", "go"],
      },
      {
        keys: [getPlatformAlternateKey(), "S"],
        label: "shortcut.navigation.settings",
        action: "navigation.jump.settings",
        icon: "arrow_forward",
        keywords: [
          "settings",
          "jump",
          "page",
          "navigation",
          "account",
          "theme",
          "go",
        ],
      },
    ],
  },
  {
    section: "Miscellaneous",
    shortcuts: [
      {
        keys: [getPlatformSpecialKey(), "M"],
        label: "shortcut.miscellaneous.invite",
        action: "modals.share.toggle",
        icon: "person_add_alt",
        keywords: ["invite", "share", "app", "social"],
      },
    ],
  },
]
