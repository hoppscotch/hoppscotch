import { Environment } from "@hoppscotch/data"
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore"
import { platform } from "~/platform"
import {
  environments$,
  globalEnv$,
  replaceEnvironments,
  setGlobalEnvVariables,
} from "~/newstore/environments"
import { getSettingSubject, settingsStore } from "~/newstore/settings"

/**
 * Used locally to prevent infinite loop when environment sync update
 * is applied to the store which then fires the store sync listener.
 * When you want to update environments and not want to fire the update listener,
 * set this to true and then set it back to false once it is done
 */
let loadedEnvironments = false

/**
 * Used locally to prevent infinite loop when global env sync update
 * is applied to the store which then fires the store sync listener.
 * When you want to update global env and not want to fire the update listener,
 * set this to true and then set it back to false once it is done
 */
let loadedGlobals = true

async function writeEnvironments(environment: Environment[]) {
  const currentUser = platform.auth.getCurrentUser()

  if (currentUser === null)
    throw new Error("Cannot write environments when signed out")

  const ev = {
    updatedOn: new Date(),
    author: currentUser.uid,
    author_name: currentUser.displayName,
    author_image: currentUser.photoURL,
    environment,
  }

  try {
    await setDoc(
      doc(getFirestore(), "users", currentUser.uid, "environments", "sync"),
      ev
    )
  } catch (e) {
    console.error("error updating", ev, e)
    throw e
  }
}

async function writeGlobalEnvironment(variables: Environment["variables"]) {
  const currentUser = platform.auth.getCurrentUser()

  if (currentUser === null)
    throw new Error("Cannot write global environment when signed out")

  const ev = {
    updatedOn: new Date(),
    author: currentUser.uid,
    author_name: currentUser.displayName,
    author_image: currentUser.photoURL,
    variables,
  }

  try {
    await setDoc(
      doc(getFirestore(), "users", currentUser.uid, "globalEnv", "sync"),
      ev
    )
  } catch (e) {
    console.error("error updating", ev, e)
    throw e
  }
}

export function initEnvironments() {
  const currentUser$ = platform.auth.getCurrentUserStream()

  const envListenSub = environments$.subscribe((envs) => {
    const currentUser = platform.auth.getCurrentUser()

    if (
      currentUser &&
      settingsStore.value.syncEnvironments &&
      loadedEnvironments
    ) {
      writeEnvironments(envs)
    }
  })

  const globalListenSub = globalEnv$.subscribe((vars) => {
    const currentUser = platform.auth.getCurrentUser()

    if (currentUser && settingsStore.value.syncEnvironments && loadedGlobals) {
      writeGlobalEnvironment(vars)
    }
  })

  let envSnapshotStop: (() => void) | null = null
  let globalsSnapshotStop: (() => void) | null = null

  const currentUserSub = currentUser$.subscribe((user) => {
    if (!user) {
      // User logged out, clean up snapshot listener
      if (envSnapshotStop) {
        envSnapshotStop()
        envSnapshotStop = null
      }

      if (globalsSnapshotStop) {
        globalsSnapshotStop()
        globalsSnapshotStop = null
      }
    } else if (user) {
      envSnapshotStop = onSnapshot(
        collection(getFirestore(), "users", user.uid, "environments"),
        (environmentsRef) => {
          const environments: any[] = []

          environmentsRef.forEach((doc) => {
            const environment = doc.data()
            environment.id = doc.id
            environments.push(environment)
          })

          loadedEnvironments = false
          if (environments.length > 0 && settingsStore.value.syncEnvironments) {
            replaceEnvironments(environments[0].environment)
          }
          loadedEnvironments = true
        }
      )
      globalsSnapshotStop = onSnapshot(
        collection(getFirestore(), "users", user.uid, "globalEnv"),
        (globalsRef) => {
          if (globalsRef.docs.length === 0) {
            loadedGlobals = true
            return
          }

          const doc = globalsRef.docs[0].data()
          loadedGlobals = false
          if (settingsStore.value.syncEnvironments)
            setGlobalEnvVariables(doc.variables)
          loadedGlobals = true
        }
      )
    }
  })

  let oldSyncStatus = settingsStore.value.syncEnvironments

  const syncStop = getSettingSubject("syncEnvironments").subscribe(
    (newStatus) => {
      if (oldSyncStatus === true && newStatus === false) {
        envSnapshotStop?.()
        globalsSnapshotStop?.()

        oldSyncStatus = newStatus
      } else if (oldSyncStatus === false && newStatus === true) {
        syncStop.unsubscribe()
        envListenSub.unsubscribe()
        globalListenSub.unsubscribe()
        currentUserSub.unsubscribe()

        initEnvironments()
      }
    }
  )
}
