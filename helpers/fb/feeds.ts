import firebase from "firebase"
import { BehaviorSubject } from "rxjs"
import { currentUser$ } from "./auth"

type HoppFeed = firebase.firestore.DocumentData & {
  id: string
  label: string
  message: string
}

/**
 * An observable subject which is defined as an array of feeds
 * the current user has.
 *
 * Note: If this is null, then it means the user is not signed in
 */
export const currentFeeds$ = new BehaviorSubject<HoppFeed[] | null>(null)

export function initFeeds() {
  let snapshotStop: (() => void) | null = null

  currentUser$.subscribe((user) => {
    if (!user && snapshotStop) {
      // User has logged out, clean up snapshot listeners
      snapshotStop()
      snapshotStop = null
    } else if (user) {
      snapshotStop = firebase
        .firestore()
        .collection("users")
        .doc(user.uid)
        .collection("feeds")
        .orderBy("createdOn", "desc")
        .onSnapshot((feedsRef) => {
          const feeds: HoppFeed[] = []

          feedsRef.forEach((doc) => {
            const feed = doc.data()
            feed.id = doc.id
            feeds.push(feed as HoppFeed)
          })

          currentFeeds$.next(feeds)
        })
    }
  })
}

export async function writeFeed(label: string, message: string) {
  if (currentUser$.value == null)
    throw new Error("Logged out user cannot write to feeds")

  const dt = {
    createdOn: new Date(),
    author: currentUser$.value.uid,
    author_name: currentUser$.value.displayName,
    author_image: currentUser$.value.photoURL,
    message,
    label,
  }

  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(currentUser$.value.uid)
      .collection("feeds")
      .add(dt)
  } catch (e) {
    console.error("error inserting", dt, e)
    throw e
  }
}

export async function deleteFeed(id: string) {
  if (currentUser$.value == null)
    throw new Error("Logged out user cannot delete feed")

  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(currentUser$.value.uid)
      .collection("feeds")
      .doc(id)
      .delete()
  } catch (e) {
    console.error("error deleting", id, e)
    throw e
  }
}
