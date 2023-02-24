import { AuthPlatformDef } from "./auth"
import { UIPlatformDef } from "./ui"

export type PlatformDef = {
  ui?: UIPlatformDef
  auth: AuthPlatformDef
}

export let platform: PlatformDef

export function setPlatformDef(def: PlatformDef) {
  platform = def
}
