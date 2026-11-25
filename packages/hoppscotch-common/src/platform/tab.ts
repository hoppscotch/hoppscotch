import { PersistableTabState } from "~/services/tab"
import { HoppUser } from "./auth"
import { HoppTabDocument } from "~/helpers/tab/document"

export type TabStatePlatformDef = {
  loadTabStateFromSync: () => Promise<PersistableTabState<HoppTabDocument> | null>
  writeCurrentTabState: (
    user: HoppUser,
    persistableTabState: PersistableTabState<HoppTabDocument>
  ) => Promise<void>
}
