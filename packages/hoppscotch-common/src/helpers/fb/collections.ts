import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore"
import {
  translateToNewRESTCollection,
  translateToNewGQLCollection,
} from "@hoppscotch/data"
import { platform } from "~/platform"
import {
  restCollections$,
  graphqlCollections$,
  setRESTCollections,
  setGraphqlCollections,
} from "~/newstore/collections"
import { getSettingSubject, settingsStore } from "~/newstore/settings"

type CollectionFlags = "collectionsGraphql" | "collections"

/**
 * Whether the collections are loaded. If this is set to true
 * Updates to the collections store are written into firebase.
 *
 * If you have want to update the store and not fire the store update
 * subscription, set this variable to false, do the update and then
 * set it to true
 */
let loadedRESTCollections = false

/**
 * Whether the collections are loaded. If this is set to true
 * Updates to the collections store are written into firebase.
 *
 * If you have want to update the store and not fire the store update
 * subscription, set this variable to false, do the update and then
 * set it to true
 */
let loadedGraphqlCollections = false

export async function writeCollections(
  collection: any[],
  flag: CollectionFlags
) {
  const currentUser = platform.auth.getCurrentUser()

  if (currentUser === null)
    throw new Error("User not logged in to write collections")

  const cl = {
    updatedOn: new Date(),
    author: currentUser.uid,
    author_name: currentUser.displayName,
    author_image: currentUser.photoURL,
    collection,
  }

  try {
    await setDoc(
      doc(getFirestore(), "users", currentUser.uid, flag, "sync"),
      cl
    )
  } catch (e) {
    console.error("error updating", cl, e)
    throw e
  }
}

export function initCollections() {
  const currentUser$ = platform.auth.getCurrentUserStream()

  const restCollSub = restCollections$.subscribe((collections) => {
    const currentUser = platform.auth.getCurrentUser()

    if (
      loadedRESTCollections &&
      currentUser &&
      settingsStore.value.syncCollections
    ) {
      writeCollections(collections, "collections")
    }
  })

  const gqlCollSub = graphqlCollections$.subscribe((collections) => {
    if (
      loadedGraphqlCollections &&
      currentUser &&
      settingsStore.value.syncCollections
    ) {
      writeCollections(collections, "collectionsGraphql")
    }
  })

  let restSnapshotStop: (() => void) | null = null
  let graphqlSnapshotStop: (() => void) | null = null

  const currentUserSub = currentUser$.subscribe((user) => {
    if (!user) {
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
        collection(getFirestore(), "users", user.uid, "collections"),
        (collectionsRef) => {
          const collections: any[] = []
          collectionsRef.forEach((doc) => {
            const collection = doc.data()
            collection.id = doc.id
            collections.push(collection)
          })

          // Prevent infinite ping-pong of updates
          loadedRESTCollections = false

          // TODO: Wth is with collections[0]
          if (collections.length > 0 && settingsStore.value.syncCollections) {
            setRESTCollections(
              (collections[0].collection ?? []).map(
                translateToNewRESTCollection
              )
            )
          }

          loadedRESTCollections = true
        }
      )

      graphqlSnapshotStop = onSnapshot(
        collection(getFirestore(), "users", user.uid, "collectionsGraphql"),
        (collectionsRef) => {
          const collections: any[] = []
          collectionsRef.forEach((doc) => {
            const collection = doc.data()
            collection.id = doc.id
            collections.push(collection)
          })

          // Prevent infinite ping-pong of updates
          loadedGraphqlCollections = false

          // TODO: Wth is with collections[0]
          if (collections.length > 0 && settingsStore.value.syncCollections) {
            setGraphqlCollections(
              (collections[0].collection ?? []).map(translateToNewGQLCollection)
            )
          }

          loadedGraphqlCollections = true
        }
      )
    }
  })

  let oldSyncStatus = settingsStore.value.syncCollections

  const syncStop = getSettingSubject("syncCollections").subscribe(
    (newStatus) => {
      if (oldSyncStatus === true && newStatus === false) {
        restSnapshotStop?.()
        graphqlSnapshotStop?.()

        oldSyncStatus = newStatus
      } else if (oldSyncStatus === false && newStatus === true) {
        syncStop.unsubscribe()
        restCollSub.unsubscribe()
        gqlCollSub.unsubscribe()
        currentUserSub.unsubscribe()

        initCollections()
      }
    }
  )
}
