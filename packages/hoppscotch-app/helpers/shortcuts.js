import { getPlatformAlternateKey, getPlatformSpecialKey } from "./platformutils"

export default [
  {
    section: "shortcut.general.title",
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
    section: "shortcut.request.title",
    shortcuts: [
      {
        keys: [getPlatformSpecialKey(), "G"],
        label: "shortcut.request.send_request",
      },
      {
        keys: [getPlatformSpecialKey(), "S"],
        label: "shortcut.request.save_to_collections",
      },
      {
        keys: [getPlatformSpecialKey(), "U"],
        label: "shortcut.request.copy_request_link",
      },
      {
        keys: [getPlatformSpecialKey(), "I"],
        label: "shortcut.request.reset_request",
      },
      {
        keys: [getPlatformAlternateKey(), "↑"],
        label: "shortcut.request.next_method",
      },
      {
        keys: [getPlatformAlternateKey(), "↓"],
        label: "shortcut.request.previous_method",
      },
      {
        keys: [getPlatformAlternateKey(), "G"],
        label: "shortcut.request.get_method",
      },
      {
        keys: [getPlatformAlternateKey(), "H"],
        label: "shortcut.request.head_method",
      },
      {
        keys: [getPlatformAlternateKey(), "P"],
        label: "shortcut.request.post_method",
      },
      {
        keys: [getPlatformAlternateKey(), "U"],
        label: "shortcut.request.put_method",
      },
      {
        keys: [getPlatformAlternateKey(), "X"],
        label: "shortcut.request.delete_method",
      },
    ],
  },
  {
    section: "shortcut.navigation.title",
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
    section: "shortcut.miscellaneous.title",
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
    section: "app.spotlight",
    shortcuts: [
      {
        keys: ["?"],
        label: "shortcut.general.help_menu",
        action: "modals.support.toggle",
        icon: "life-buoy",
      },
      {
        keys: [getPlatformSpecialKey(), "K"],
        label: "shortcut.general.show_all",
        action: "flyouts.keybinds.toggle",
        icon: "zap",
      },
    ],
  },
  {
    section: "shortcut.navigation.title",
    shortcuts: [
      {
        keys: [getPlatformAlternateKey(), "R"],
        label: "shortcut.navigation.rest",
        action: "navigation.jump.rest",
        icon: "arrow-right",
      },
      {
        keys: [getPlatformAlternateKey(), "Q"],
        label: "shortcut.navigation.graphql",
        action: "navigation.jump.graphql",
        icon: "arrow-right",
      },
      {
        keys: [getPlatformAlternateKey(), "W"],
        label: "shortcut.navigation.realtime",
        action: "navigation.jump.realtime",
        icon: "arrow-right",
      },
      {
        keys: [getPlatformAlternateKey(), "D"],
        label: "shortcut.navigation.documentation",
        action: "navigation.jump.documentation",
        icon: "arrow-right",
      },
      {
        keys: [getPlatformAlternateKey(), "S"],
        label: "shortcut.navigation.settings",
        action: "navigation.jump.settings",
        icon: "arrow-right",
      },
    ],
  },
  {
    section: "shortcut.miscellaneous.title",
    shortcuts: [
      {
        keys: [getPlatformSpecialKey(), "M"],
        label: "shortcut.miscellaneous.invite",
        action: "modals.share.toggle",
        icon: "gift",
      },
    ],
  },
]

export const fuse = [
  {
    keys: ["?"],
    label: "shortcut.general.help_menu",
    action: "modals.support.toggle",
    icon: "life-buoy",
    tags: [
      "help",
      "support",
      "menu",
      "discord",
      "twitter",
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
    icon: "zap",
    tags: ["keyboard", "shortcuts"],
  },
  {
    keys: [getPlatformAlternateKey(), "R"],
    label: "shortcut.navigation.rest",
    action: "navigation.jump.rest",
    icon: "arrow-right",
    tags: ["rest", "jump", "page", "navigation", "go"],
  },
  {
    keys: [getPlatformAlternateKey(), "Q"],
    label: "shortcut.navigation.graphql",
    action: "navigation.jump.graphql",
    icon: "arrow-right",
    tags: ["graphql", "jump", "page", "navigation", "go"],
  },
  {
    keys: [getPlatformAlternateKey(), "W"],
    label: "shortcut.navigation.realtime",
    action: "navigation.jump.realtime",
    icon: "arrow-right",
    tags: [
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
    icon: "arrow-right",
    tags: ["documentation", "jump", "page", "navigation", "go"],
  },
  {
    keys: [getPlatformAlternateKey(), "S"],
    label: "shortcut.navigation.settings",
    action: "navigation.jump.settings",
    icon: "arrow-right",
    tags: ["settings", "jump", "page", "navigation", "account", "theme", "go"],
  },
  {
    keys: [getPlatformSpecialKey(), "M"],
    label: "shortcut.miscellaneous.invite",
    action: "modals.share.toggle",
    icon: "gift",
    tags: ["invite", "share", "app", "friends", "people", "social"],
  },
]
