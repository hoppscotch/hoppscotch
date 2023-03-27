import { PersistableRESTTabState } from "~/helpers/rest/tab"

export type TabStatePlatformDef = {
  loadTabStateFromSync: () => Promise<PersistableRESTTabState | null>
  writeCurrentTabState: (
    persistableTabState: PersistableRESTTabState
  ) => void | any
}
