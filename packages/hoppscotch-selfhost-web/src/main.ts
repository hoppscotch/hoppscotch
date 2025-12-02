import { nextTick, ref, watch } from "vue"
import { emit, listen } from "@tauri-apps/api/event"
import { createHoppApp } from "@hoppscotch/common"
import { useSettingStatic } from "@hoppscotch/common/composables/settings"
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

        const isCtrlOrCmd = e.ctrlKey || e.metaKey
        let shortcutEvent: string | null = null

        if (
          isCtrlOrCmd &&
          !e.shiftKey &&
          !e.altKey &&
          e.key.toLowerCase() === "q"
        ) {
          // Ctrl/Cmd + Q - Quit Application
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          shortcutEvent = "ctrl-q"
        } else if (
          isCtrlOrCmd &&
          !e.shiftKey &&
          !e.altKey &&
          e.key.toLowerCase() === "t"
        ) {
          // Ctrl/Cmd + T - New Tab
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          shortcutEvent = "ctrl-t"
        } else if (
          isCtrlOrCmd &&
          !e.shiftKey &&
          !e.altKey &&
          e.key.toLowerCase() === "w"
        ) {
          // Ctrl/Cmd + W - Close Tab
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          shortcutEvent = "ctrl-w"
        } else if (
          isCtrlOrCmd &&
          e.shiftKey &&
          !e.altKey &&
          e.key.toLowerCase() === "t"
        ) {
          // Ctrl/Cmd + Shift + T - Reopen Tab
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          shortcutEvent = "ctrl-shift-t"
        } else if (
          isCtrlOrCmd &&
          !e.shiftKey &&
          e.altKey &&
          e.key === "ArrowRight"
        ) {
          // Ctrl/Cmd + Alt + Right - Next Tab
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          shortcutEvent = "ctrl-alt-right"
        } else if (
          isCtrlOrCmd &&
          !e.shiftKey &&
          e.altKey &&
          e.key === "ArrowLeft"
        ) {
          // Ctrl/Cmd + Alt + Left - Previous Tab
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          shortcutEvent = "ctrl-alt-left"
        } else if (
          isCtrlOrCmd &&
          !e.shiftKey &&
          e.altKey &&
          (e.key === "9" || e.code === "Digit9")
        ) {
          // Ctrl/Cmd + Alt + 9 - First Tab
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          shortcutEvent = "ctrl-alt-9"
        } else if (
          isCtrlOrCmd &&
          !e.shiftKey &&
          e.altKey &&
          (e.key === "0" || e.code === "Digit0")
        ) {
          // Ctrl/Cmd + Alt + 0 - Last Tab
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          shortcutEvent = "ctrl-alt-0"
        } else if (
          isCtrlOrCmd &&
          !e.shiftKey &&
          !e.altKey &&
          e.key.toLowerCase() === "l"
        ) {
          // Ctrl/Cmd + L - Focus Address Bar
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          shortcutEvent = "focus-url"
        }

        if (shortcutEvent) {
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
