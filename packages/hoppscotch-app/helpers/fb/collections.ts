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
import { currentUser$ } from "./auth"
import {
  restCollections$,
  graphqlCollections$,
  setRESTCollections,
  setGraphqlCollections,
} from "~/newstore/collections"
import { settingsStore } from "~/newstore/settings"

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
  if (currentUser$.value === null)
    throw new Error("User not logged in to write collections")

  const cl = {
    updatedOn: new Date(),
    author: currentUser$.value.uid,
    author_name: currentUser$.value.displayName,
    author_image: currentUser$.value.photoURL,
    collection,
  }

  try {
    await setDoc(
      doc(getFirestore(), "users", currentUser$.value.uid, flag, "sync"),
      cl
    )
  } catch (e) {
    console.error("error updating", cl, e)
    throw e
  }
}

export function initCollections() {
  restCollections$.subscribe((collections) => {
    if (
      loadedRESTCollections &&
      currentUser$.value &&
      settingsStore.value.syncCollections
    ) {
      writeCollections(collections, "collections")
    }
  })

  graphqlCollections$.subscribe((collections) => {
    if (
      loadedGraphqlCollections &&
      currentUser$.value &&
      settingsStore.value.syncCollections
    ) {
      writeCollections(collections, "collectionsGraphql")
    }
  })

  let restSnapshotStop: (() => void) | null = null
  let graphqlSnapshotStop: (() => void) | null = null

  currentUser$.subscribe((user) => {
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
          if (collections.length > 0) {
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
          if (collections.length > 0) {
            setGraphqlCollections(
              (collections[0].collection ?? []).map(translateToNewGQLCollection)
            )
          }

          loadedGraphqlCollections = true
        }
      )
    }
  })
}
