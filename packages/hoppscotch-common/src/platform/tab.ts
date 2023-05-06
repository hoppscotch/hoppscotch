import { PersistableRESTTabState } from "~/helpers/rest/tab"
import { HoppUser } from "./auth"

export type TabStatePlatformDef = {
  loadTabStateFromSync: () => Promise<PersistableRESTTabState | null>
  writeCurrentTabState: (
    user: HoppUser,
    persistableTabState: PersistableRESTTabState
  ) => Promise<void>
}
