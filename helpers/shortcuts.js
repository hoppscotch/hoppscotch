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
    section: "shortcut.navigation.title",
    shortcuts: [
      {
        keys: [getPlatformSpecialKey(), "←"],
        label: "shortcut.navigation.back",
        action: "navigation.jump.back",
        icon: "arrow_forward",
      },
      {
        keys: [getPlatformSpecialKey(), "→"],
        label: "shortcut.navigation.forward",
        action: "navigation.jump.forward",
        icon: "arrow_forward",
      },
      {
        keys: [getPlatformAlternateKey(), "R"],
        label: "shortcut.navigation.rest",
        action: "navigation.jump.rest",
        icon: "arrow_forward",
      },
      {
        keys: [getPlatformAlternateKey(), "Q"],
        label: "shortcut.navigation.graphql",
        action: "navigation.jump.graphql",
        icon: "arrow_forward",
      },
      {
        keys: [getPlatformAlternateKey(), "W"],
        label: "shortcut.navigation.realtime",
        action: "navigation.jump.realtime",
        icon: "arrow_forward",
      },
      {
        keys: [getPlatformAlternateKey(), "D"],
        label: "shortcut.navigation.documentation",
        action: "navigation.jump.documentation",
        icon: "arrow_forward",
      },
      {
        keys: [getPlatformAlternateKey(), "S"],
        label: "shortcut.navigation.settings",
        action: "navigation.jump.settings",
        icon: "arrow_forward",
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
        icon: "person_add_alt",
      },
    ],
  },
]

export const lunr = [
  {
    keys: ["?"],
    label: "shortcut.general.help_menu",
    action: "modals.support.toggle",
    icon: "support",
    tags: "help support documentation troubleshooting chat community feedback report bug issue ticket",
  },
  {
    keys: [getPlatformSpecialKey(), "K"],
    label: "shortcut.general.show_all",
    action: "flyouts.keybinds.toggle",
    icon: "keyboard",
    tags: "keyboard shortcuts",
  },
  {
    keys: [getPlatformSpecialKey(), "←"],
    label: "shortcut.navigation.back",
    action: "navigation.jump.back",
    icon: "arrow_forward",
    tags: "back jump page navigation go",
  },
  {
    keys: [getPlatformSpecialKey(), "→"],
    label: "shortcut.navigation.forward",
    action: "navigation.jump.forward",
    icon: "arrow_forward",
    tags: "forward jump next forward page navigation go",
  },
  {
    keys: [getPlatformAlternateKey(), "R"],
    label: "shortcut.navigation.rest",
    action: "navigation.jump.rest",
    icon: "arrow_forward",
    tags: "rest jump page navigation go",
  },
  {
    keys: [getPlatformAlternateKey(), "Q"],
    label: "shortcut.navigation.graphql",
    action: "navigation.jump.graphql",
    icon: "arrow_forward",
    tags: "graphql jump page navigation go",
  },
  {
    keys: [getPlatformAlternateKey(), "W"],
    label: "shortcut.navigation.realtime",
    action: "navigation.jump.realtime",
    icon: "arrow_forward",
    tags: "realtime jump page navigation websocket socket mqtt sse go",
  },
  {
    keys: [getPlatformAlternateKey(), "D"],
    label: "shortcut.navigation.documentation",
    action: "navigation.jump.documentation",
    icon: "arrow_forward",
    tags: "documentation jump page navigation go",
  },
  {
    keys: [getPlatformAlternateKey(), "S"],
    label: "shortcut.navigation.settings",
    action: "navigation.jump.settings",
    icon: "arrow_forward",
    tags: "settings jump page navigation account theme go",
  },
  {
    keys: [getPlatformSpecialKey(), "M"],
    label: "shortcut.miscellaneous.invite",
    action: "modals.share.toggle",
    icon: "person_add_alt",
    tags: "invite share app social",
  },
]
