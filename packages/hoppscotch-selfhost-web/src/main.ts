import { ref } from "vue"
import { listen } from "@tauri-apps/api/event"
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

    // Add backspace prevention for non-text inputs
    window.addEventListener(
      "keydown",
      function (e) {
        if (e.key === "Backspace" && !isTextInput(e.target)) {
          e.preventDefault()
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
