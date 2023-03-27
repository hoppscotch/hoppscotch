import { TabStatePlatformDef } from "@hoppscotch/common/platform/tab"
import { PersistableRESTTabState } from "@hoppscotch/common/helpers/rest/tab"
import { HoppRESTRequest, translateToNewRequest } from "@hoppscotch/data"
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore"
import { def as platformAuth } from "./firebase/auth"

/**
 * Writes a request to a user's firestore sync
 *
 * @param user The user to write to
 * @param request The request to write to the request sync
 */
function writeCurrentTabState(persistableTabState: PersistableRESTTabState) {
  const currentUser = platformAuth.getCurrentUser()!

  // Remove FormData entries because those can't be stored on Firestore ?

  return setDoc(
    doc(getFirestore(), "users", currentUser.uid, "requests", "tab-state"),
    persistableTabState
  )
}

/**
 * Loads the synced request from the firestore sync
 *
 * @returns Fetched request object if exists else null
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
