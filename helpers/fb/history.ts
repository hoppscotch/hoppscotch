import firebase from "firebase/app"
import "firebase/firestore"
import { currentUser$ } from "./auth"
import { settingsStore } from "~/newstore/settings"
import {
  graphqlHistoryStore,
  HISTORY_LIMIT,
  RESTHistoryEntry,
  restHistoryStore,
  setGraphqlHistoryEntries,
  setRESTHistoryEntries,
  translateToNewRESTHistory,
} from "~/newstore/history"

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

async function writeHistory(entry: any, col: HistoryFBCollections) {
  if (currentUser$.value == null)
    throw new Error("User not logged in to sync history")

  const hs = {
    ...entry,
    updatedOn: new Date(),
  }

  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(currentUser$.value.uid)
      .collection(col)
      .add(hs)
  } catch (e) {
    console.error("error writing to history", hs, e)
    throw e
  }
}

async function deleteHistory(entry: any, col: HistoryFBCollections) {
  if (currentUser$.value == null)
    throw new Error("User not logged in to delete history")

  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(currentUser$.value.uid)
      .collection(col)
      .doc(entry.id)
      .delete()
  } catch (e) {
    console.error("error deleting history", entry, e)
    throw e
  }
}

async function clearHistory(col: HistoryFBCollections) {
  if (currentUser$.value == null)
    throw new Error("User not logged in to clear history")

  const { docs } = await firebase
    .firestore()
    .collection("users")
    .doc(currentUser$.value.uid)
    .collection(col)
    .get()

  await Promise.all(docs.map((e) => deleteHistory(e, col)))
}

async function toggleStar(entry: any, col: HistoryFBCollections) {
  if (currentUser$.value == null)
    throw new Error("User not logged in to toggle star")

  console.log(entry)

  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(currentUser$.value.uid)
      .collection(col)
      .doc(entry.id)
      .update({ star: !entry.star })
  } catch (e) {
    console.error("error toggling star", entry, e)
    throw e
  }
}

export function initHistory() {
  restHistoryStore.dispatches$.subscribe((dispatch) => {
    if (
      loadedRESTHistory &&
      currentUser$.value &&
      settingsStore.value.syncHistory
    ) {
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

  graphqlHistoryStore.dispatches$.subscribe((dispatch) => {
    if (
      loadedGraphqlHistory &&
      currentUser$.value &&
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
  })

  let restSnapshotStop: (() => void) | null = null
  let graphqlSnapshotStop: (() => void) | null = null

  currentUser$.subscribe((user) => {
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
      restSnapshotStop = firebase
        .firestore()
        .collection("users")
        .doc(user.uid)
        .collection("history")
        .orderBy("updatedOn", "desc")
        .limit(HISTORY_LIMIT)
        .onSnapshot((historyRef) => {
          const history: RESTHistoryEntry[] = []

          historyRef.forEach((doc) => {
            const entry = doc.data()
            entry.id = doc.id
            history.push(translateToNewRESTHistory(entry))
          })

          loadedRESTHistory = false
          setRESTHistoryEntries(history)
          loadedRESTHistory = true
        })

      graphqlSnapshotStop = firebase
        .firestore()
        .collection("users")
        .doc(user.uid)
        .collection("graphqlHistory")
        .orderBy("updatedOn", "desc")
        .limit(HISTORY_LIMIT)
        .onSnapshot((historyRef) => {
          const history: any[] = []

          historyRef.forEach((doc) => {
            const entry = doc.data()
            entry.id = doc.id
            history.push(entry)
          })

          loadedGraphqlHistory = false
          setGraphqlHistoryEntries(history)
          loadedGraphqlHistory = true
        })
    }
  })
}

restHistoryStore.dispatches$.subscribe((state) => {
  console.log(state)
})
