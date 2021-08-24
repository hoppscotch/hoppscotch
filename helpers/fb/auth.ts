import firebase from "firebase"
import { BehaviorSubject, Subject } from "rxjs"

export type HoppUser = firebase.User & {
  provider?: string
  accessToken?: string
}

type AuthEvents =
  | { event: "login"; user: HoppUser }
  | { event: "logout" }
  | { event: "authTokenUpdate"; user: HoppUser; newToken: string | null }

/**
 * A BehaviorSubject emitting the currently logged in user (or null if not logged in)
 */
export const currentUser$ = new BehaviorSubject<HoppUser | null>(null)
/**
 * A BehaviorSubject emitting the current idToken
 */
export const authIdToken$ = new BehaviorSubject<string | null>(null)

/**
 * A subject that emits events related to authentication flows
 */
export const authEvents$ = new Subject<AuthEvents>()

/**
 * Initializes the firebase authentication related subjects
 */
export function initAuth() {
  let extraSnapshotStop: (() => void) | null = null

  firebase.auth().onAuthStateChanged((user) => {
    /** Whether the user was logged in before */
    const wasLoggedIn = currentUser$.value !== null

    if (!user && extraSnapshotStop) {
      extraSnapshotStop()
      extraSnapshotStop = null
    } else if (user) {
      // Merge all the user info from all the authenticated providers
      user.providerData.forEach((profile) => {
        if (!profile) return

        const us = {
          updatedOn: new Date(),
          provider: profile.providerId,
          name: profile.displayName,
          email: profile.email,
          photoUrl: profile.photoURL,
          uid: profile.uid,
        }

        firebase
          .firestore()
          .collection("users")
          .doc(user.uid)
          .set(us, { merge: true })
          .catch((e) => console.error("error updating", us, e))
      })

      extraSnapshotStop = firebase
        .firestore()
        .collection("users")
        .doc(user.uid)
        .onSnapshot((doc) => {
          const data = doc.data()

          const userUpdate: HoppUser = user

          if (data) {
            // Write extra provider data
            userUpdate.provider = data.provider
            userUpdate.accessToken = data.accessToken
          }

          currentUser$.next(userUpdate)
        })
    }
    currentUser$.next(user)

    // User wasn't found before, but now is there (login happened)
    if (!wasLoggedIn && user) {
      authEvents$.next({
        event: "login",
        user: currentUser$.value!!,
      })
    } else if (wasLoggedIn && !user) {
      // User was found before, but now is not there (logout happened)
      authEvents$.next({
        event: "logout",
      })
    }
  })

  firebase.auth().onIdTokenChanged(async (user) => {
    if (user) {
      authIdToken$.next(await user.getIdToken())

      authEvents$.next({
        event: "authTokenUpdate",
        newToken: authIdToken$.value,
        user: currentUser$.value!!, // Force not-null because user is defined
      })
    } else {
      authIdToken$.next(null)
    }
  })
}

/**
 * Sign user in with a popup using Google
 */
export async function signInUserWithGoogle() {
  return await firebase
    .auth()
    .signInWithPopup(new firebase.auth.GoogleAuthProvider())
}

/**
 * Sign user in with a popup using Github
 */
export async function signInUserWithGithub() {
  return await firebase
    .auth()
    .signInWithPopup(new firebase.auth.GithubAuthProvider().addScope("gist"))
}

/**
 * Sign user in with email and password
 */
export async function signInWithEmailAndPassword(
  email: string,
  password: string
) {
  return await firebase.auth().signInWithEmailAndPassword(email, password)
}

/**
 * Gets the sign in methods for a given email address
 *
 * @param email - Email to get the methods of
 *
 * @returns Promise for string array of the auth provider methods accessible
 */
export async function getSignInMethodsForEmail(email: string) {
  return await firebase.auth().fetchSignInMethodsForEmail(email)
}

/**
 * Sends an email with the signin link to the user
 *
 * @param email - Email to send the email to
 * @param actionCodeSettings - The settings to apply to the link
 */
export async function signInWithEmail(
  email: string,
  actionCodeSettings: firebase.auth.ActionCodeSettings
) {
  return await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings)
}

/**
 * Checks and returns whether the sign in link is an email link
 *
 * @param url - The URL to look in
 */
export function isSignInWithEmailLink(url: string) {
  return firebase.auth().isSignInWithEmailLink(url)
}

/**
 * Sends an email with sign in with email link
 *
 * @param email - Email to log in to
 * @param url - The action URL which is used to validate login
 */
export async function signInWithEmailLink(email: string, url: string) {
  return await firebase.auth().signInWithEmailLink(email, url)
}

/**
 * Signs out the user
 */
export async function signOutUser() {
  if (!currentUser$.value) throw new Error("No user has logged in")

  await firebase.auth().signOut()
}

/**
 * Sets the provider id and relevant provider auth token
 * as user metadata
 *
 * @param id - The provider ID
 * @param token - The relevant auth token for the given provider
 */
export async function setProviderInfo(id: string, token: string) {
  if (!currentUser$.value) throw new Error("No user has logged in")

  const us = {
    updatedOn: new Date(),
    provider: id,
    accessToken: token,
  }

  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(currentUser$.value.uid)
      .update(us)
      .catch((e) => console.error("error updating", us, e))
  } catch (e) {
    console.error("error updating", e)

    throw e
  }
}
