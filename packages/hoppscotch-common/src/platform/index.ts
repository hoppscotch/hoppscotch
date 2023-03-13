import { AuthPlatformDef } from "./auth"
import { UIPlatformDef } from "./ui"
import { EnvironmentsPlatformDef } from "./environments"
import { CollectionsPlatformDef } from "./collections"

export type PlatformDef = {
  ui?: UIPlatformDef
  auth: AuthPlatformDef
  sync: {
    environments: EnvironmentsPlatformDef
    collections: CollectionsPlatformDef
  }
}

export let platform: PlatformDef

export function setPlatformDef(def: PlatformDef) {
  platform = def
}
