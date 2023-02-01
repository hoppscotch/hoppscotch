import { AuthPlatformDef } from "./auth"
import { UIPlatformDef } from "./ui"
import { EnvironmentsPlatformDef } from "./environments"
import { CollectionsPlatformDef } from "./collections"
import { SettingsPlatformDef } from "./settings"
import { HistoryPlatformDef } from "./history"

export type PlatformDef = {
  ui?: UIPlatformDef
  auth: AuthPlatformDef
  sync: {
    environments: EnvironmentsPlatformDef
    collections: CollectionsPlatformDef
    settings: SettingsPlatformDef
    history: HistoryPlatformDef
  }
}

export let platform: PlatformDef

export function setPlatformDef(def: PlatformDef) {
  platform = def
}
