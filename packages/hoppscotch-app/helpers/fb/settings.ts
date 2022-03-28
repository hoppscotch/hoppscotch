import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore"
import { currentUser$ } from "./auth"
import { applySetting, settingsStore, SettingsType } from "~/newstore/settings"

/**
 * Used locally to prevent infinite loop when settings sync update
 * is applied to the store which then fires the store sync listener.
 * When you want to update settings and not want to fire the update listener,
 * set this to true and then set it back to false once it is done
 */
let loadedSettings = false

/**
 * Write Transform
 */
async function writeSettings(setting: string, value: any) {
  if (currentUser$.value === null)
    throw new Error("Cannot write setting, user not signed in")

  const st = {
    updatedOn: new Date(),
    author: currentUser$.value.uid,
    author_name: currentUser$.value.displayName,
    author_image: currentUser$.value.photoURL,
    name: setting,
    value,
  }

  try {
    await setDoc(
      doc(getFirestore(), "users", currentUser$.value.uid, "settings", setting),
      st
    )
  } catch (e) {
    console.error("error updating", st, e)
    throw e
  }
}

export function initSettings() {
  settingsStore.dispatches$.subscribe((dispatch) => {
    if (currentUser$.value && loadedSettings) {
      if (dispatch.dispatcher === "bulkApplySettings") {
        Object.keys(dispatch.payload).forEach((key) => {
          writeSettings(key, dispatch.payload[key])
        })
      } else {
        writeSettings(
          dispatch.payload.settingKey,
          settingsStore.value[dispatch.payload.settingKey as keyof SettingsType]
        )
      }
    }
  })

  let snapshotStop: (() => void) | null = null

  // Subscribe and unsubscribe event listeners
  currentUser$.subscribe((user) => {
    if (!user && snapshotStop) {
      // User logged out
      snapshotStop()
      snapshotStop = null
    } else if (user) {
      snapshotStop = onSnapshot(
        collection(getFirestore(), "users", user.uid, "settings"),
        (settingsRef) => {
          const settings: any[] = []

          settingsRef.forEach((doc) => {
            const setting = doc.data()
            setting.id = doc.id
            settings.push(setting)
          })

          loadedSettings = false
          settings.forEach((e) => {
            if (e && e.name && e.value != null) {
              applySetting(e.name, e.value)
            }
          })
          loadedSettings = true
        }
      )
    }
  })
}
