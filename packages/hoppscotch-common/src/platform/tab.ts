import { PersistableTabState } from "~/services/tab"
import { HoppUser } from "./auth"
import { HoppRESTDocument } from "~/helpers/rest/document"

export type TabStatePlatformDef = {
  loadTabStateFromSync: () => Promise<PersistableTabState<HoppRESTDocument> | null>
  writeCurrentTabState: (
    user: HoppUser,
    persistableTabState: PersistableTabState<HoppRESTDocument>
  ) => Promise<void>
}
