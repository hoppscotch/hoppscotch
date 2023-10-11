import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./platform/auth"
import { def as environmentsDef } from "./platform/environments/environments.platform"
import { def as collectionsDef } from "./platform/collections/collections.platform"
import { def as settingsDef } from "./platform/settings/settings.platform"
import { def as historyDef } from "./platform/history/history.platform"
import { def as tabStateDef } from "./platform/tabState/tabState.platform"
import { localclientInterceptor } from "./platform/std/interceptors/localclient"
import { browserInterceptor } from "@hoppscotch/common/platform/std/interceptors/browser"
import { proxyInterceptor } from "@hoppscotch/common/platform/std/interceptors/proxy"
import { ExtensionInspectorService } from "@hoppscotch/common/platform/std/inspections/extension.inspector"
import { ExtensionInterceptorService } from "@hoppscotch/common/platform/std/interceptors/extension"
import { nextTick, ref, watch } from "vue"
import { emit, listen } from "@tauri-apps/api/event"
import { type } from "@tauri-apps/api/os"
import { useSettingStatic } from "@hoppscotch/common/composables/settings"
import { appWindow } from "@tauri-apps/api/window"
import { stdFooterItems } from "@hoppscotch/common/platform/std/ui/footerItem"
import { stdSupportOptionItems } from "@hoppscotch/common/platform/std/ui/supportOptionsItem"
import { useMousePressed } from "@vueuse/core"

const headerPaddingLeft = ref("0px")
const headerPaddingTop = ref("0px")

createHoppApp("#app", {
  ui: {
    additionalFooterMenuItems: stdFooterItems,
    additionalSupportOptionsMenuItems: stdSupportOptionItems,
    appHeader: {
      paddingLeft: headerPaddingLeft,
      paddingTop: headerPaddingTop,
    },
  },
  auth: authDef,
  sync: {
    environments: environmentsDef,
    collections: collectionsDef,
    settings: settingsDef,
    history: historyDef,
    tabState: tabStateDef,
  },
  interceptors: {
    default: "localclient",
    interceptors: [
      { type: "standalone", interceptor: localclientInterceptor },
      { type: "standalone", interceptor: browserInterceptor },
      { type: "standalone", interceptor: proxyInterceptor },
      { type: "service", service: ExtensionInterceptorService },
    ],
  },
  additionalInspectors: [
    { type: "service", service: ExtensionInspectorService },
  ],
  platformFeatureFlags: {
    exportAsGIST: false,
    hasTelemetry: false,
  },
})

watch(
  useSettingStatic("BG_COLOR")[0],
  async () => {
    await nextTick()

    await emit(
      "hopp-bg-changed",
      getComputedStyle(document.documentElement).getPropertyValue(
        "--primary-color"
      )
    )
  },
  { immediate: true }
)
;(async () => {
  const platform = await type()

  if (platform === "Darwin") {
    listen("will-enter-fullscreen", () => {
      headerPaddingTop.value = "0px"
      headerPaddingLeft.value = "0px"
    })

    listen("will-exit-fullscreen", () => {
      headerPaddingTop.value = "2px"
      headerPaddingLeft.value = "70px"
    })

    headerPaddingTop.value = "2px"
    headerPaddingLeft.value = "70px"
  }
})()

const { pressed } = useMousePressed()

document.addEventListener("mousemove", (ev) => {
  const { clientX, clientY } = ev

  const el = document.querySelector("header")

  if (!el) return

  const { left, top, width, height } = el.getBoundingClientRect()

  if (
    clientX >= left &&
    clientX <= left + width &&
    clientY >= top &&
    clientY <= top + height
  ) {
    if (pressed.value) {
      appWindow.startDragging()
    }
  }
})
