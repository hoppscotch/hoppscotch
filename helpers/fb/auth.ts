import {
  User,
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithEmailAndPassword as signInWithEmailAndPass,
  isSignInWithEmailLink as isSignInWithEmailLinkFB,
  fetchSignInMethodsForEmail,
  sendSignInLinkToEmail,
  signInWithEmailLink as signInWithEmailLinkFB,
  ActionCodeSettings,
  signOut,
  linkWithCredential,
  AuthCredential,
  UserCredential,
} from "firebase/auth"
import {
  onSnapshot,
  getFirestore,
  setDoc,
  doc,
  updateDoc,
} from "firebase/firestore"
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  map,
  Subject,
  Subscription,
} from "rxjs"
import { onBeforeUnmount, onMounted } from "@nuxtjs/composition-api"

export type HoppUser = User & {
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
  const auth = getAuth()
  const firestore = getFirestore()

  let extraSnapshotStop: (() => void) | null = null

  onAuthStateChanged(auth, (user) => {
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

        setDoc(doc(firestore, "users", user.uid), us, { merge: true }).catch(
          (e) => console.error("error updating", us, e)
        )
      })

      extraSnapshotStop = onSnapshot(
        doc(firestore, "users", user.uid),
        (doc) => {
          const data = doc.data()

          const userUpdate: HoppUser = user

          if (data) {
            // Write extra provider data
            userUpdate.provider = data.provider
            userUpdate.accessToken = data.accessToken
          }

          currentUser$.next(userUpdate)
        }
      )
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

  onIdTokenChanged(auth, async (user) => {
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
  return await signInWithPopup(getAuth(), new GoogleAuthProvider())
}

/**
 * Sign user in with a popup using Github
 */
export async function signInUserWithGithub() {
  return await signInWithPopup(
    getAuth(),
    new GithubAuthProvider().addScope("gist")
  )
}

/**
 * Sign user in with email and password
 */
export async function signInWithEmailAndPassword(
  email: string,
  password: string
) {
  return await signInWithEmailAndPass(getAuth(), email, password)
}

/**
 * Gets the sign in methods for a given email address
 *
 * @param email - Email to get the methods of
 *
 * @returns Promise for string array of the auth provider methods accessible
 */
export async function getSignInMethodsForEmail(email: string) {
  return await fetchSignInMethodsForEmail(getAuth(), email)
}

export async function linkWithFBCredential(
  user: User,
  credential: AuthCredential
) {
  return await linkWithCredential(user, credential)
}

/**
 * Sends an email with the signin link to the user
 *
 * @param email - Email to send the email to
 * @param actionCodeSettings - The settings to apply to the link
 */
export async function signInWithEmail(
  email: string,
  actionCodeSettings: ActionCodeSettings
) {
  return await sendSignInLinkToEmail(getAuth(), email, actionCodeSettings)
}

/**
 * Checks and returns whether the sign in link is an email link
 *
 * @param url - The URL to look in
 */
export function isSignInWithEmailLink(url: string) {
  return isSignInWithEmailLinkFB(getAuth(), url)
}

/**
 * Sends an email with sign in with email link
 *
 * @param email - Email to log in to
 * @param url - The action URL which is used to validate login
 */
export async function signInWithEmailLink(email: string, url: string) {
  return await signInWithEmailLinkFB(getAuth(), email, url)
}

/**
 * Signs out the user
 */
export async function signOutUser() {
  if (!currentUser$.value) throw new Error("No user has logged in")

  await signOut(getAuth())
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
    await updateDoc(
      doc(getFirestore(), "users", currentUser$.value.uid),
      us
    ).catch((e) => console.error("error updating", us, e))
  } catch (e) {
    console.error("error updating", e)
    throw e
  }
}

export function getGithubCredentialFromResult(result: UserCredential) {
  return GithubAuthProvider.credentialFromResult(result)
}

/**
 * A Vue composable function that is called when the auth status
 * is being updated to being logged in (fired multiple times),
 * this is also called on component mount if the login
 * was already resolved before mount.
 */
export function onLoggedIn(exec: (user: HoppUser) => void) {
  let sub: Subscription | null = null

  onMounted(() => {
    sub = currentUser$
      .pipe(
        map((user) => !!user), // Get a logged in status (true or false)
        distinctUntilChanged(), // Don't propagate unless the status updates
        filter((x) => x) // Don't propagate unless it is logged in
      )
      .subscribe(() => {
        exec(currentUser$.value!)
      })
  })

  onBeforeUnmount(() => {
    sub?.unsubscribe()
  })
}
