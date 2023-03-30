import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore"
import { FormDataKeyValue } from "@hoppscotch/data"
import { def as platformAuth } from "./firebase/auth"
import {
  getSettingSubject,
  settingsStore,
} from "@hoppscotch/common/newstore/settings"
import {
  GQLHistoryEntry,
  graphqlHistoryStore,
  HISTORY_LIMIT,
  RESTHistoryEntry,
  restHistoryStore,
  setGraphqlHistoryEntries,
  setRESTHistoryEntries,
  translateToNewGQLHistory,
  translateToNewRESTHistory,
} from "@hoppscotch/common/newstore/history"
import { HistoryPlatformDef } from "@hoppscotch/common/platform/history"

type HistoryFBCollections = "history" | "graphqlHistory"

/**
 * Whether the history are loaded. If this is set to true
 * Updates to the history store are written into firebase.
 *
 * If you have want to update the store and not fire the store update
 * subscription, set this variable to false, do the update and then
 * set it to true
 */
let loadedRESTHistory = false

/**
 * Whether the history are loaded. If this is set to true
 * Updates to the history store are written into firebase.
 *
 * If you have want to update the store and not fire the store update
 * subscription, set this variable to false, do the update and then
 * set it to true
 */
let loadedGraphqlHistory = false

const purgeFormDataFromRequest = (req: RESTHistoryEntry): RESTHistoryEntry => {
  if (req.request.body.contentType !== "multipart/form-data") return req

  req.request.body.body = req.request.body.body.map<FormDataKeyValue>(
    (formData) => {
      if (!formData.isFile) return formData

      return {
        active: formData.active,
        isFile: false, // Something we can do to keep the status ?
        key: formData.key,
        value: "",
      }
    }
  )

  return req
}

async function writeHistory(
  entry: RESTHistoryEntry | GQLHistoryEntry,
  col: HistoryFBCollections
) {
  const processedEntry =
    col === "history"
      ? purgeFormDataFromRequest(entry as RESTHistoryEntry)
      : entry

  const currentUser = platformAuth.getCurrentUser()

  if (currentUser === null)
    throw new Error("User not logged in to sync history")

  const hs = {
    ...processedEntry,
    updatedOn: new Date(),
  }

  try {
    await addDoc(collection(getFirestore(), "users", currentUser.uid, col), hs)
  } catch (e) {
    console.error("error writing to history", hs, e)
    throw e
  }
}

async function deleteHistory(
  entry: (RESTHistoryEntry | GQLHistoryEntry) & { id: string },
  col: HistoryFBCollections
) {
  const currentUser = platformAuth.getCurrentUser()

  if (currentUser === null)
    throw new Error("User not logged in to delete history")

  try {
    await deleteDoc(
      doc(getFirestore(), "users", currentUser.uid, col, entry.id)
    )
  } catch (e) {
    console.error("error deleting history", entry, e)
    throw e
  }
}

async function clearHistory(col: HistoryFBCollections) {
  const currentUser = platformAuth.getCurrentUser()

  if (currentUser === null)
    throw new Error("User not logged in to clear history")

  const { docs } = await getDocs(
    collection(getFirestore(), "users", currentUser.uid, col)
  )

  await Promise.all(docs.map((e) => deleteHistory(e as any, col)))
}

async function toggleStar(
  entry: (RESTHistoryEntry | GQLHistoryEntry) & { id: string },
  col: HistoryFBCollections
) {
  const currentUser = platformAuth.getCurrentUser()

  if (currentUser === null) throw new Error("User not logged in to toggle star")

  try {
    await updateDoc(
      doc(getFirestore(), "users", currentUser.uid, col, entry.id),
      { star: !entry.star }
    )
  } catch (e) {
    console.error("error toggling star", entry, e)
    throw e
  }
}

export function initHistorySync() {
  const currentUser$ = platformAuth.getCurrentUserStream()

  const restHistorySub = restHistoryStore.dispatches$.subscribe((dispatch) => {
    const currentUser = platformAuth.getCurrentUser()

    if (loadedRESTHistory && currentUser && settingsStore.value.syncHistory) {
      if (dispatch.dispatcher === "addEntry") {
        writeHistory(dispatch.payload.entry, "history")
      } else if (dispatch.dispatcher === "deleteEntry") {
        deleteHistory(dispatch.payload.entry, "history")
      } else if (dispatch.dispatcher === "clearHistory") {
        clearHistory("history")
      } else if (dispatch.dispatcher === "toggleStar") {
        toggleStar(dispatch.payload.entry, "history")
      }
    }
  })

  const gqlHistorySub = graphqlHistoryStore.dispatches$.subscribe(
    (dispatch) => {
      const currentUser = platformAuth.getCurrentUser()

      if (
        loadedGraphqlHistory &&
        currentUser &&
        settingsStore.value.syncHistory
      ) {
        if (dispatch.dispatcher === "addEntry") {
          writeHistory(dispatch.payload.entry, "graphqlHistory")
        } else if (dispatch.dispatcher === "deleteEntry") {
          deleteHistory(dispatch.payload.entry, "graphqlHistory")
        } else if (dispatch.dispatcher === "clearHistory") {
          clearHistory("graphqlHistory")
        } else if (dispatch.dispatcher === "toggleStar") {
          toggleStar(dispatch.payload.entry, "graphqlHistory")
        }
      }
    }
  )

  let restSnapshotStop: (() => void) | null = null
  let graphqlSnapshotStop: (() => void) | null = null

  const currentUserSub = currentUser$.subscribe((user) => {
    if (!user) {
      // Clear the snapshot listeners when the user logs out
      if (restSnapshotStop) {
        restSnapshotStop()
        restSnapshotStop = null
      }

      if (graphqlSnapshotStop) {
        graphqlSnapshotStop()
        graphqlSnapshotStop = null
      }
    } else {
      restSnapshotStop = onSnapshot(
        query(
          collection(getFirestore(), "users", user.uid, "history"),
          orderBy("updatedOn", "desc"),
          limit(HISTORY_LIMIT)
        ),
        (historyRef) => {
          const history: RESTHistoryEntry[] = []

          historyRef.forEach((doc) => {
            const entry = doc.data()
            entry.id = doc.id
            entry.updatedOn = doc.data().updatedOn.toDate()
            history.push(translateToNewRESTHistory(entry))
          })

          loadedRESTHistory = false
          setRESTHistoryEntries(history)
          loadedRESTHistory = true
        }
      )

      graphqlSnapshotStop = onSnapshot(
        query(
          collection(getFirestore(), "users", user.uid, "graphqlHistory"),
          orderBy("updatedOn", "desc"),
          limit(HISTORY_LIMIT)
        ),
        (historyRef) => {
          const history: GQLHistoryEntry[] = []

          historyRef.forEach((doc) => {
            const entry = doc.data()
            entry.id = doc.id
            entry.updatedOn = doc.data().updatedOn.toDate()
            history.push(translateToNewGQLHistory(entry))
          })

          loadedGraphqlHistory = false
          setGraphqlHistoryEntries(history)
          loadedGraphqlHistory = true
        }
      )
    }
  })

  let oldSyncStatus = settingsStore.value.syncHistory

  const syncStop = getSettingSubject("syncHistory").subscribe((newStatus) => {
    if (oldSyncStatus === true && newStatus === false) {
      restSnapshotStop?.()
      graphqlSnapshotStop?.()

      oldSyncStatus = newStatus
    } else if (oldSyncStatus === false && newStatus === true) {
      syncStop.unsubscribe()
      restHistorySub.unsubscribe()
      gqlHistorySub.unsubscribe()
      currentUserSub.unsubscribe()

      initHistorySync()
    }
  })
}

export const def: HistoryPlatformDef = {
  initHistorySync,
}
