import { AuthPlatformDef } from "./auth"
import { UIPlatformDef } from "./ui"
import { EnvironmentsPlatformDef } from "./environments"
import { CollectionsPlatformDef } from "./collections"
import { SettingsPlatformDef } from "./settings"
import { HistoryPlatformDef } from "./history"
import { TabStatePlatformDef } from "./tab"
import { AnalyticsPlatformDef } from "./analytics"
import { InterceptorsPlatformDef } from "./interceptors"

export type PlatformDef = {
  ui?: UIPlatformDef
  auth: AuthPlatformDef
  analytics?: AnalyticsPlatformDef
  sync: {
    environments: EnvironmentsPlatformDef
    collections: CollectionsPlatformDef
    settings: SettingsPlatformDef
    history: HistoryPlatformDef
    tabState: TabStatePlatformDef
  }
  interceptors: InterceptorsPlatformDef
  platformFeatureFlags: {
    exportAsGIST: boolean
  }
}

export let platform: PlatformDef

export function setPlatformDef(def: PlatformDef) {
  platform = def
}
