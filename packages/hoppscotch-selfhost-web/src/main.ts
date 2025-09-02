import { ref } from "vue"
import { listen, emit } from "@tauri-apps/api/event"

import { createHoppApp } from "@hoppscotch/common"

import { def as webAuth } from "@platform/auth/web"
import { def as webEnvironments } from "@platform/environments/web"
import { def as webCollections } from "@platform/collections/web"
import { def as webSettings } from "@platform/settings/web"
import { def as webHistory } from "@platform/history/web"

import { def as desktopAuth } from "@platform/auth/desktop"
import { def as desktopEnvironments } from "@platform/environments/desktop"
import { def as desktopCollections } from "@platform/collections/desktop"
import { def as desktopSettings } from "@platform/settings/desktop"
import { def as desktopHistory } from "@platform/history/desktop"

import { def as stdBackendDef } from "@hoppscotch/common/platform/std/backend"
import { stdFooterItems } from "@hoppscotch/common/platform/std/ui/footerItem"
import { stdSupportOptionItems } from "@hoppscotch/common/platform/std/ui/supportOptionsItem"
import { InfraPlatform } from "@platform/infra/infra.platform"
import { getKernelMode } from "@hoppscotch/kernel"
import { kernelIO } from "@hoppscotch/common/platform/std/kernel-io"

import { NativeKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/native"
import { AgentKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/agent"
import { ProxyKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/proxy"
import { ExtensionKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/extension"
import { BrowserKernelInterceptorService } from "@hoppscotch/common/platform/std/kernel-interceptors/browser"
import { HeaderDownloadableLinksService } from "./services/headerDownloadableLinks.service"

type Platform = "web" | "desktop"

const createPlatformDef = <Web, Desktop>(web: Web, desktop: Desktop) => ({
  web,
  desktop,
  get: (platform: Platform) => (platform === "web" ? web : desktop),
})

const webInterceptors = [
  BrowserKernelInterceptorService,
  ProxyKernelInterceptorService,
  AgentKernelInterceptorService,
  ExtensionKernelInterceptorService,
]
const desktopInterceptors = [
  NativeKernelInterceptorService,
  ProxyKernelInterceptorService,
]

const platformDefs = {
  auth: createPlatformDef(webAuth, desktopAuth),
  environments: createPlatformDef(webEnvironments, desktopEnvironments),
  collections: createPlatformDef(webCollections, desktopCollections),
  settings: createPlatformDef(webSettings, desktopSettings),
  history: createPlatformDef(webHistory, desktopHistory),
  interceptors: createPlatformDef(webInterceptors, desktopInterceptors),
}

const kernelMode = getKernelMode()
const headerPaddingLeft = ref("0px")
const headerPaddingTop = ref("0px")

const getInterceptors = (mode: Platform) =>
  platformDefs.interceptors.get(mode).map((service) => ({
    type: "service" as const,
    service,
  }))

async function initApp() {
  await createHoppApp("#app", {
    ui: {
      additionalFooterMenuItems: stdFooterItems,
      additionalSupportOptionsMenuItems: stdSupportOptionItems,
      appHeader: {
        paddingLeft: headerPaddingLeft,
        paddingTop: headerPaddingTop,
      },
    },
    auth: platformDefs.auth.get(kernelMode),
    kernelIO,
    instance: {
      instanceType: "vendored",
      displayConfig: {
        displayName: "Hoppscotch",
        description: "On-Prem",
        version: "25.8.1",
        connectingMessage: "Connecting to On-prem",
        connectedMessage: "Connected to On-prem",
      },
    },
    sync: {
      environments: platformDefs.environments.get(kernelMode),
      collections: platformDefs.collections.get(kernelMode),
      settings: platformDefs.settings.get(kernelMode),
      history: platformDefs.history.get(kernelMode),
    },
    kernelInterceptors: {
      default: kernelMode === "desktop" ? "native" : "browser",
      interceptors: getInterceptors(kernelMode),
    },
    platformFeatureFlags: {
      exportAsGIST: false,
      hasTelemetry: false,
      cookiesEnabled: kernelMode === "desktop",
      promptAsUsingCookies: false,
    },
    limits: {
      collectionImportSizeLimit: 50,
    },
    infra: InfraPlatform,
    backend: stdBackendDef,
    additionalLinks: [HeaderDownloadableLinksService],
  })

  if (kernelMode === "desktop") {
    listen("will-enter-fullscreen", () => {
      headerPaddingTop.value = "0px"
      headerPaddingLeft.value = "0px"
    })

    listen("will-exit-fullscreen", () => {
      headerPaddingTop.value = "0px"
      headerPaddingLeft.value = "80px"
    })

    headerPaddingTop.value = "0px"
    headerPaddingLeft.value = "80px"

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

function isTextInput(target: EventTarget | null) {
  if (target instanceof HTMLInputElement) {
    return (
      target.type === "text" ||
      target.type === "email" ||
      target.type === "password" ||
      target.type === "number" ||
      target.type === "search" ||
      target.type === "tel" ||
      target.type === "url" ||
      target.type === "textarea"
    )
  } else if (target instanceof HTMLTextAreaElement) {
    return true
  } else if (target instanceof HTMLElement && target.isContentEditable) {
    return true
  }
  return false
}

initApp().catch(console.error)
