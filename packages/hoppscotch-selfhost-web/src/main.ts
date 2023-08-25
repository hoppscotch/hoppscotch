import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./platform/auth"
import { def as environmentsDef } from "./platform/environments/environments.platform"
import { def as collectionsDef } from "./platform/collections/collections.platform"
import { def as settingsDef } from "./platform/settings/settings.platform"
import { def as historyDef } from "./platform/history/history.platform"
import { def as tabStateDef } from "./platform/tabState/tabState.platform"
import { browserInterceptor } from "@hoppscotch/common/platform/std/interceptors/browser"
import { proxyInterceptor } from "@hoppscotch/common/platform/std/interceptors/proxy"
import { ExtensionInterceptorService } from "@hoppscotch/common/platform/std/interceptors/extension"
import { stdFooterItems } from "@hoppscotch/common/platform/std/ui/footerItem"
import { stdSupportOptionItems } from "@hoppscotch/common/platform/std/ui/supportOptionsItem"

createHoppApp("#app", {
  ui: {
    additionalFooterMenuItems: stdFooterItems,
    additionalSupportOptionsMenuItems: stdSupportOptionItems,
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
    default: "browser",
    interceptors: [
      { type: "standalone", interceptor: browserInterceptor },
      { type: "standalone", interceptor: proxyInterceptor },
      { type: "service", service: ExtensionInterceptorService },
    ],
  },
  platformFeatureFlags: {
    exportAsGIST: false,
  },
})
