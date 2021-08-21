import firebase from "firebase/app"
import "firebase/firestore"
import { currentUser$ } from "./auth"
import {
  Environment,
  environments$,
  globalEnv$,
  replaceEnvironments,
  setGlobalEnvVariables,
} from "~/newstore/environments"
import { settingsStore } from "~/newstore/settings"

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
  if (currentUser$.value == null)
    throw new Error("Cannot write environments when signed out")

  const ev = {
    updatedOn: new Date(),
    author: currentUser$.value.uid,
    author_name: currentUser$.value.displayName,
    author_image: currentUser$.value.photoURL,
    environment,
  }

  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(currentUser$.value.uid)
      .collection("environments")
      .doc("sync")
      .set(ev)
  } catch (e) {
    console.error("error updating", ev, e)
    throw e
  }
}

async function writeGlobalEnvironment(variables: Environment["variables"]) {
  if (currentUser$.value == null)
    throw new Error("Cannot write global environment when signed out")

  const ev = {
    updatedOn: new Date(),
    author: currentUser$.value.uid,
    author_name: currentUser$.value.displayName,
    author_image: currentUser$.value.photoURL,
    variables,
  }

  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(currentUser$.value.uid)
      .collection("globalEnv")
      .doc("sync")
      .set(ev)
  } catch (e) {
    console.error("error updating", ev, e)
    throw e
  }
}

export function initEnvironments() {
  environments$.subscribe((envs) => {
    if (
      currentUser$.value &&
      settingsStore.value.syncEnvironments &&
      loadedEnvironments
    ) {
      writeEnvironments(envs)
    }
  })

  globalEnv$.subscribe((vars) => {
    if (
      currentUser$.value &&
      settingsStore.value.syncEnvironments &&
      loadedGlobals
    ) {
      writeGlobalEnvironment(vars)
    }
  })

  let envSnapshotStop: (() => void) | null = null
  let globalsSnapshotStop: (() => void) | null = null

  currentUser$.subscribe((user) => {
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
      envSnapshotStop = firebase
        .firestore()
        .collection("users")
        .doc(user.uid)
        .collection("environments")
        .onSnapshot((environmentsRef) => {
          const environments: any[] = []

          environmentsRef.forEach((doc) => {
            const environment = doc.data()
            environment.id = doc.id
            environments.push(environment)
          })

          loadedEnvironments = false
          if (environments.length > 0) {
            replaceEnvironments(environments[0].environment)
          }
          loadedEnvironments = true
        })
      globalsSnapshotStop = firebase
        .firestore()
        .collection("users")
        .doc(user.uid)
        .collection("globalEnv")
        .onSnapshot((globalsRef) => {
          if (globalsRef.docs.length === 0) {
            loadedGlobals = true
            return
          }

          const doc = globalsRef.docs[0].data()
          loadedGlobals = false
          setGlobalEnvVariables(doc.variables)
          loadedGlobals = true
        })
    }
  })
}
