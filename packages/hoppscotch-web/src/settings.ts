import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore"
import { def as platformAuth } from "./firebase/auth"
import {
  applySetting,
  settingsStore,
  SettingsDef,
} from "@hoppscotch/common/newstore/settings"
import { SettingsPlatformDef } from "@hoppscotch/common/platform/settings"

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
  const currentUser = platformAuth.getCurrentUser()

  if (currentUser === null)
    throw new Error("Cannot write setting, user not signed in")

  const st = {
    updatedOn: new Date(),
    author: currentUser.uid,
    author_name: currentUser.displayName,
    author_image: currentUser.photoURL,
    name: setting,
    value,
  }

  try {
    await setDoc(
      doc(getFirestore(), "users", currentUser.uid, "settings", setting),
      st
    )
  } catch (e) {
    console.error("error updating", st, e)
    throw e
  }
}

export function initSettingsSync() {
  const currentUser$ = platformAuth.getCurrentUserStream()

  settingsStore.dispatches$.subscribe((dispatch) => {
    const currentUser = platformAuth.getCurrentUser()

    if (currentUser && loadedSettings) {
      if (dispatch.dispatcher === "bulkApplySettings") {
        Object.keys(dispatch.payload).forEach((key) => {
          writeSettings(key, dispatch.payload[key])
        })
      } else {
        writeSettings(
          dispatch.payload.settingKey,
          settingsStore.value[dispatch.payload.settingKey as keyof SettingsDef]
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

export const def: SettingsPlatformDef = {
  initSettingsSync,
}
