import IconLifeBuoy from "~icons/lucide/life-buoy"
import IconZap from "~icons/lucide/zap"
import IconArrowRight from "~icons/lucide/arrow-right"
import IconGift from "~icons/lucide/gift"
import IconMonitor from "~icons/lucide/monitor"
import IconSun from "~icons/lucide/sun"
import IconCloud from "~icons/lucide/cloud"
import IconMoon from "~icons/lucide/moon"
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
        keys: ["ESC"],
        label: "shortcut.general.close_current_menu",
      },
    ],
  },
  {
    section: "shortcut.request.title",
    shortcuts: [
      {
        keys: [getPlatformSpecialKey(), "Enter"],
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
    section: "shortcut.response.title",
    shortcuts: [
      {
        keys: [getPlatformSpecialKey(), "J"],
        label: "shortcut.response.download",
      },
      {
        keys: [getPlatformSpecialKey(), "."],
        label: "shortcut.response.copy",
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
        keys: [getPlatformAlternateKey(), "S"],
        label: "shortcut.navigation.settings",
      },
      {
        keys: [getPlatformAlternateKey(), "M"],
        label: "shortcut.navigation.profile",
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
        icon: IconLifeBuoy,
      },
      {
        keys: [getPlatformSpecialKey(), "K"],
        label: "shortcut.general.show_all",
        action: "flyouts.keybinds.toggle",
        icon: IconZap,
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
        icon: IconArrowRight,
      },
      {
        keys: [getPlatformAlternateKey(), "Q"],
        label: "shortcut.navigation.graphql",
        action: "navigation.jump.graphql",
        icon: IconArrowRight,
      },
      {
        keys: [getPlatformAlternateKey(), "W"],
        label: "shortcut.navigation.realtime",
        action: "navigation.jump.realtime",
        icon: IconArrowRight,
      },
      {
        keys: [getPlatformAlternateKey(), "S"],
        label: "shortcut.navigation.settings",
        action: "navigation.jump.settings",
        icon: IconArrowRight,
      },
      {
        keys: [getPlatformAlternateKey(), "M"],
        label: "shortcut.navigation.profile",
        action: "navigation.jump.profile",
        icon: IconArrowRight,
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
        icon: IconGift,
      },
    ],
  },
]

export const fuse = [
  {
    keys: ["?"],
    label: "shortcut.general.help_menu",
    action: "modals.support.toggle",
    icon: IconLifeBuoy,
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
    icon: IconZap,
    tags: ["keyboard", "shortcuts"],
  },
  {
    keys: [getPlatformAlternateKey(), "R"],
    label: "shortcut.navigation.rest",
    action: "navigation.jump.rest",
    icon: IconArrowRight,
    tags: ["rest", "jump", "page", "navigation", "go"],
  },
  {
    keys: [getPlatformAlternateKey(), "Q"],
    label: "shortcut.navigation.graphql",
    action: "navigation.jump.graphql",
    icon: IconArrowRight,
    tags: ["graphql", "jump", "page", "navigation", "go"],
  },
  {
    keys: [getPlatformAlternateKey(), "W"],
    label: "shortcut.navigation.realtime",
    action: "navigation.jump.realtime",
    icon: IconArrowRight,
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
    keys: [getPlatformAlternateKey(), "S"],
    label: "shortcut.navigation.settings",
    action: "navigation.jump.settings",
    icon: IconArrowRight,
    tags: ["settings", "jump", "page", "navigation", "account", "theme", "go"],
  },
  {
    keys: [getPlatformAlternateKey(), "M"],
    label: "shortcut.navigation.profile",
    action: "navigation.jump.profile",
    icon: IconArrowRight,
    tags: ["profile", "jump", "page", "navigation", "account", "theme", "go"],
  },
  {
    keys: [getPlatformSpecialKey(), "M"],
    label: "shortcut.miscellaneous.invite",
    action: "modals.share.toggle",
    icon: IconGift,
    tags: ["invite", "share", "app", "friends", "people", "social"],
  },
  {
    keys: [getPlatformAlternateKey(), "0"],
    label: "shortcut.theme.system",
    action: "settings.theme.system",
    icon: IconMonitor,
    tags: ["theme", "system"],
  },
  {
    keys: [getPlatformAlternateKey(), "1"],
    label: "shortcut.theme.light",
    action: "settings.theme.light",
    icon: IconSun,
    tags: ["theme", "light"],
  },
  {
    keys: [getPlatformAlternateKey(), "2"],
    label: "shortcut.theme.dark",
    action: "settings.theme.dark",
    icon: IconCloud,
    tags: ["theme", "dark"],
  },
  {
    keys: [getPlatformAlternateKey(), "3"],
    label: "shortcut.theme.black",
    action: "settings.theme.black",
    icon: IconMoon,
    tags: ["theme", "black"],
  },
]
