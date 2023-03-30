import { PersistableRESTTabState } from "@hoppscotch/common/helpers/rest/tab"
import { HoppUser } from "@hoppscotch/common/platform/auth"
import { TabStatePlatformDef } from "@hoppscotch/common/platform/tab"
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore"
import { def as platformAuth } from "./firebase/auth"

/**
 * Writes tab state to a user's firestore sync
 *
 * @param persistableTabState The tab state to write to the request sync
 */
function writeCurrentTabState(
  user: HoppUser,
  persistableTabState: PersistableRESTTabState
) {
  // Remove FormData entries because those can't be stored on Firestore ?

  return setDoc(
    doc(getFirestore(), "users", user.uid, "requests", "tab-state"),
    persistableTabState
  )
}

/**
 * Loads the synced tab state from the firestore sync
 *
 * @returns Fetched tab state object if exists else null
 */
async function loadTabStateFromSync(): Promise<PersistableRESTTabState | null> {
  const currentUser = platformAuth.getCurrentUser()

  if (!currentUser)
    throw new Error("Cannot load request from sync without login")

  const fbDoc = await getDoc(
    doc(getFirestore(), "users", currentUser.uid, "requests", "tab-state")
  )

  const data = fbDoc.data()

  if (!data) return null
  else return data as PersistableRESTTabState
}

export const def: TabStatePlatformDef = {
  loadTabStateFromSync,
  writeCurrentTabState,
}
