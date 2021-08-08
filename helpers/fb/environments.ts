import firebase from "firebase/app"
import "firebase/firestore"
import { currentUser$ } from "./auth"
import {
  Environment,
  environments$,
  replaceEnvironments,
} from "~/newstore/environments"
import { settingsStore } from "~/newstore/settings"

/**
 * Used locally to prevent infinite loop when environment sync update
 * is applied to the store which then fires the store sync listener.
 * When you want to update environments and not want to fire the update listener,
 * set this to true and then set it back to false once it is done
 */
let loadedEnvironments = false

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

  let snapshotStop: (() => void) | null = null

  currentUser$.subscribe((user) => {
    if (!user && snapshotStop) {
      // User logged out, clean up snapshot listener
      snapshotStop()
      snapshotStop = null
    } else if (user) {
      snapshotStop = firebase
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
          replaceEnvironments(environments[0].environment)
          loadedEnvironments = true
        })
    }
  })
}
