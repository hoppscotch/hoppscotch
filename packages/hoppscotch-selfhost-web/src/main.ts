import { nextTick, ref, watch } from "vue"
import { emit, listen } from "@tauri-apps/api/event"
import { createHoppApp } from "@hoppscotch/common"
import { useSettingStatic } from "@hoppscotch/common/composables/settings"
import { useDesktopSettings } from "@hoppscotch/common/composables/desktop-settings"
import { resolvePressedKey } from "@hoppscotch/common/helpers/keybindings"
import { getKeyboardLayoutStrategy } from "@hoppscotch/common/helpers/keyboard-strategy"
import { getKernelMode } from "@hoppscotch/kernel"

import { def as stdBackendDef } from "@hoppscotch/common/platform/std/backend"
// Platform imports
import { def as webAuth } from "@app/platform/auth/web"
import { def as webEnvironments } from "@app/platform/environments/web"
import { def as webCollections } from "@app/platform/collections/web"
import { def as webSettings } from "@app/platform/settings/web"
import { def as webHistory } from "@app/platform/history/web"

import { def as desktopAuth } from "@app/platform/auth/desktop"
import { def as desktopEnvironments } from "@app/platform/environments/desktop"
import { def as desktopCollections } from "@app/platform/collections/desktop"
import { def as desktopSettings } from "@app/platform/settings/desktop"
import { def as desktopHistory } from "@app/platform/history/desktop"

// Std platform
import { def as webInstance } from "@app/platform/instance/web"
import { def as desktopInstance } from "@app/platform/instance/desktop"
import { stdFooterItems } from "@hoppscotch/common/platform/std/ui/footerItem"
import { stdSupportOptionItems } from "@hoppscotch/common/platform/std/ui/supportOptionsItem"
import { InfraPlatform } from "@app/platform/infra/infra.platform"
import { kernelIO } from "@hoppscotch/common/platform/std/kernel-io"
import { HeaderDownloadableLinksService } from "@app/services/headerDownloadableLinks.service"

import DesktopSettingsSection from "@hoppscotch/common/components/settings/Desktop.vue"

// Std interceptors
import { NativeKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/native"
import { AgentKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/agent"
import { ProxyKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/proxy"
import { ExtensionKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/extension"
import { BrowserKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/browser"

const PLATFORM_CONFIG = {
  web: {
    auth: webAuth,
    environments: webEnvironments,
    collections: webCollections,
    settings: webSettings,
    history: webHistory,
    instance: webInstance,
    interceptors: [
      BrowserKernelInterceptorService,
      ProxyKernelInterceptorService,
      AgentKernelInterceptorService,
      ExtensionKernelInterceptorService,
    ],
    defaultInterceptor: "browser",
    menuItems: stdFooterItems,
    supportItems: stdSupportOptionItems,
    cookiesEnabled: false,
  },

  desktop: {
    auth: desktopAuth,
    environments: desktopEnvironments,
    collections: desktopCollections,
    settings: desktopSettings,
    history: desktopHistory,
    instance: desktopInstance,
    interceptors: [
      NativeKernelInterceptorService,
      ProxyKernelInterceptorService,
    ],
    defaultInterceptor: "native",
    menuItems: stdFooterItems,
    supportItems: stdSupportOptionItems,
    cookiesEnabled: true,
  },
}

const headerPaddingLeft = ref("0px")
const headerPaddingTop = ref("0px")

function setupDesktopUI() {
  // Hydrate the keyboard-layout-strategy holder at desktop bootstrap.
  // The composable's first call triggers loadInitial, which reads the
  // persisted strategy from tauri-plugin-store and writes it into the
  // shared holder. Without this call the holder stays at its module-
  // level default ("hybrid") until Desktop.vue mounts, so a persisted
  // "key" or "code" choice would be dormant on every restart until the
  // user opened the settings page.
  useDesktopSettings()

  headerPaddingTop.value = "0px"
  headerPaddingLeft.value = "80px"

  listen("will-enter-fullscreen", () => {
    headerPaddingTop.value = "0px"
    headerPaddingLeft.value = "0px"
  })

  listen("will-exit-fullscreen", () => {
    headerPaddingTop.value = "0px"
    headerPaddingLeft.value = "80px"
  })

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Backspace" && !isTextInput(e.target)) {
        e.preventDefault()
      }
    },
    true
  )

  watch(
    useSettingStatic("BG_COLOR")[0],
    async () => {
      await nextTick()
      await emit("hopp-bg-changed")
    },
    { immediate: true }
  )
}

function isTextInput(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) {
    const textTypes = [
      "text",
      "email",
      "password",
      "number",
      "search",
      "tel",
      "url",
      "textarea",
    ]
    return textTypes.includes(target.type)
  }

  return (
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

async function initApp() {
  const platform = getKernelMode()
  const config = PLATFORM_CONFIG[platform]

  if (platform === "desktop") {
    setupDesktopUI()
  }

  await createHoppApp("#app", {
    ui: {
      additionalFooterMenuItems: config.menuItems,
      additionalSupportOptionsMenuItems: config.supportItems,
      // Desktop-only. Renders the "Desktop" block in the shared settings
      // page. The component lives in common so every shell that builds a
      // Tauri desktop target can register it the same way. Web builds pass
      // `undefined` here and the settings page renders without the block.
      additionalSettingsSections:
        platform === "desktop" ? [DesktopSettingsSection] : undefined,
      appHeader: {
        paddingLeft: headerPaddingLeft,
        paddingTop: headerPaddingTop,
      },
    },

    auth: config.auth,
    kernelIO,
    instance: config.instance,
    sync: {
      environments: config.environments,
      collections: config.collections,
      settings: config.settings,
      history: config.history,
    },

    kernelInterceptors: {
      default: config.defaultInterceptor,
      interceptors: config.interceptors.map((service) => ({
        type: "service" as const,
        service,
      })),
    },

    platformFeatureFlags: {
      exportAsGIST: false,
      hasTelemetry: false,
      cookiesEnabled: config.cookiesEnabled,
      promptAsUsingCookies: false,
      hasCookieBasedAuth: platform === "web",
    },
    limits: {
      collectionImportSizeLimit: 50,
    },

    infra: InfraPlatform,
    backend: stdBackendDef,
    additionalLinks: [HeaderDownloadableLinksService],
    addedServices: [],
  })

  if (platform === "desktop") {
    const ALLOWED_DROP_SELECTORS = [
      '[draggable="true"]',
      ".draggable-content",
      ".draggable-handle",
      ".sortable-ghost",
      ".sortable-drag",
      ".sortable-chosen",
      ".vue-draggable",

      'input[type="file"]',
      'label[for*="attachment"]',
      ".file-chips-container",
      ".file-chips-wrapper",

      ".cm-editor",
      ".cm-content",
      ".cm-scroller",
      ".ace_editor",

      "[data-allow-drop]",
      ".drop-zone",

      "[ondrop]",
      "[data-drop-handler]",
    ].join(", ")

    const isAllowedDropTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) {
        return false
      }

      if (target.closest(ALLOWED_DROP_SELECTORS)) {
        return true
      }

      const element = target as any
      if (element._vei?.onDrop || element.__vueListeners__?.drop) {
        return true
      }

      return false
    }

    document.addEventListener(
      "drop",
      (e) => {
        if (!isAllowedDropTarget(e.target)) {
          e.preventDefault()
          e.stopPropagation()
        }
      },
      false
    )

    document.addEventListener(
      "dragover",
      (e) => {
        e.preventDefault()
      },
      false
    )

    document.addEventListener(
      "dragstart",
      (e) => {
        if (!e.target || !(e.target instanceof HTMLElement)) {
          return
        }

        const target = e.target as HTMLElement
        if (
          !target.draggable &&
          !target.closest('[draggable="true"], .draggable-content')
        ) {
          e.preventDefault()
        }
      },
      false
    )

    window.addEventListener(
      "keydown",
      function (e) {
        // Prevent backspace navigation
        // NOTE: Only for "non-text" inputs
        if (e.key === "Backspace" && !isTextInput(e.target)) {
          e.preventDefault()
          return
        }

        // Skip during IME composition (CJK input). Modern browsers report
        // `isComposing`. Older ones use the sentinel `keyCode === 229`.
        if (e.isComposing || e.keyCode === 229) return

        // Skip when AltGr is the modifier. Browsers report AltGr as
        // Ctrl+Alt on Windows, so QWERTZ users typing `[` via AltGr+8
        // would otherwise match Ctrl+Alt+[ and get hijacked into the
        // MRU tab shortcut. `getModifierState("AltGraph")` is true only
        // for AltGr, not for genuine Ctrl+Alt.
        if (e.getModifierState("AltGraph")) return

        const isCtrlOrCmd = e.ctrlKey || e.metaKey
        if (!isCtrlOrCmd) return

        // Resolve the pressed key through the active layout strategy so
        // AZERTY's "A" keycap (physical KeyQ position) fires Ctrl+A,
        // not Ctrl+Q. The in-page handler uses the same resolver, so
        // routing the capture phase through it keeps both paths
        // consistent and lets the user's strategy choice take effect
        // everywhere, including for the desktop-shell shortcuts the
        // capture phase pre-empts.
        const key = resolvePressedKey(e, getKeyboardLayoutStrategy())
        if (!key) return

        let shortcutEvent: string | null = null

        if (!e.shiftKey && !e.altKey && key === "q") {
          // Ctrl/Cmd + Q - Quit Application
          shortcutEvent = "ctrl-q"
        } else if (!e.shiftKey && !e.altKey && key === "t") {
          // Ctrl/Cmd + T - New Tab
          shortcutEvent = "ctrl-t"
        } else if (!e.shiftKey && !e.altKey && key === "w") {
          // Ctrl/Cmd + W - Close Tab
          shortcutEvent = "ctrl-w"
        } else if (e.shiftKey && !e.altKey && key === "t") {
          // Ctrl/Cmd + Shift + T - Reopen Tab
          shortcutEvent = "ctrl-shift-t"
        } else if (!e.shiftKey && e.altKey && key === "right") {
          // Ctrl/Cmd + Alt + Right - Next Tab
          shortcutEvent = "ctrl-alt-right"
        } else if (!e.shiftKey && e.altKey && key === "left") {
          // Ctrl/Cmd + Alt + Left - Previous Tab
          shortcutEvent = "ctrl-alt-left"
        } else if (!e.shiftKey && e.altKey && key === "9") {
          // Ctrl/Cmd + Alt + 9 - First Tab
          shortcutEvent = "ctrl-alt-9"
        } else if (!e.shiftKey && e.altKey && key === "0") {
          // Ctrl/Cmd + Alt + 0 - Last Tab
          shortcutEvent = "ctrl-alt-0"
        } else if (!e.shiftKey && e.altKey && key === "u") {
          // Ctrl/Cmd + Alt + U - Focus URL Bar
          shortcutEvent = "ctrl-alt-u"
        } else if (!e.shiftKey && e.altKey && key === "]") {
          // Ctrl/Cmd + Alt + ] - MRU Tab Switch
          shortcutEvent = "ctrl-alt-]"
        } else if (!e.shiftKey && e.altKey && key === "[") {
          // Ctrl/Cmd + Alt + [ - MRU Tab Switch (Reverse)
          shortcutEvent = "ctrl-alt-["
        }

        if (shortcutEvent) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()

          setTimeout(() => {
            emit("hoppscotch_desktop_shortcut", shortcutEvent).catch(
              (error) => {
                console.error("Failed to emit shortcut event:", error)
              }
            )
          }, 0)
        }
      },
      true
    )
  }
}

initApp().catch(console.error)
