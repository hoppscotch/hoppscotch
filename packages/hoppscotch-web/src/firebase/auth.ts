import {
  AuthEvent,
  AuthPlatformDef,
  HoppUser,
} from "@hoppscotch/common/platform/auth"
import {
  Subscription,
  BehaviorSubject,
  Subject,
  filter,
  map,
  combineLatest,
} from "rxjs"
import {
  setDoc,
  onSnapshot,
  updateDoc,
  doc,
  getFirestore,
} from "firebase/firestore"
import {
  AuthError,
  AuthCredential,
  User as FBUser,
  sendSignInLinkToEmail,
  linkWithCredential,
  getAuth,
  ActionCodeSettings,
  isSignInWithEmailLink as isSignInWithEmailLinkFB,
  signInWithEmailLink as signInWithEmailLinkFB,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  fetchSignInMethodsForEmail,
  updateEmail,
  updateProfile,
  reauthenticateWithCredential,
  onAuthStateChanged,
  onIdTokenChanged,
  signOut,
} from "firebase/auth"
import {
  getLocalConfig,
  removeLocalConfig,
  setLocalConfig,
} from "@hoppscotch/common/newstore/localpersistence"

export const currentUserFB$ = new BehaviorSubject<FBUser | null>(null)
export const authEvents$ = new Subject<AuthEvent>()
export const probableUser$ = new BehaviorSubject<HoppUser | null>(null)

const authIdToken$ = new BehaviorSubject<string | null>(null)

async function signInWithEmailLink(email: string, url: string) {
  return await signInWithEmailLinkFB(getAuth(), email, url)
}

function fbUserToHoppUser(user: FBUser): HoppUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  }
}

const currentUser$ = new BehaviorSubject<HoppUser | null>(null)

const EMAIL_ACTION_CODE_SETTINGS: ActionCodeSettings = {
  url: `${import.meta.env.VITE_BASE_URL}/enter`,
  handleCodeInApp: true,
}

async function signInUserWithGithubFB() {
  return await signInWithPopup(
    getAuth(),
    new GithubAuthProvider().addScope("gist")
  )
}

async function signInUserWithGoogleFB() {
  return await signInWithPopup(getAuth(), new GoogleAuthProvider())
}

async function signInUserWithMicrosoftFB() {
  return await signInWithPopup(getAuth(), new OAuthProvider("microsoft.com"))
}

/**
 * Reauthenticate the user with the given credential
 */
async function reauthenticateUser() {
  if (!currentUserFB$.value || !currentUser$.value)
    throw new Error("No user has logged in")

  const currentAuthMethod = currentUser$.value.provider

  let credential
  if (currentAuthMethod === "google.com") {
    // const result = await signInUserWithGithubFB()
    const result = await signInUserWithGoogleFB()
    credential = GithubAuthProvider.credentialFromResult(result)
  } else if (currentAuthMethod === "github.com") {
    // const result = await signInUserWithGoogleFB()
    const result = await signInUserWithGithubFB()
    credential = GoogleAuthProvider.credentialFromResult(result)
  } else if (currentAuthMethod === "microsoft.com") {
    const result = await signInUserWithMicrosoftFB()
    credential = OAuthProvider.credentialFromResult(result)
  } else if (currentAuthMethod === "password") {
    const email = prompt(
      "Reauthenticate your account using your current email:"
    )

    await def
      .signInWithEmail(email as string)
      .then(() =>
        alert(
          `Check your inbox - we sent an email to ${email}. It contains a magic link that will reauthenticate your account.`
        )
      )
      .catch((e) => {
        alert(`Error: ${e.message}`)
        console.error(e)
      })
    return
  }
  try {
    await reauthenticateWithCredential(
      currentUserFB$.value,
      credential as AuthCredential
    )
  } catch (e) {
    console.error("error updating", e)
    throw e
  }
}

/**
 * Links account with another account given in a auth/account-exists-with-different-credential error
 *
 * @param error - Error caught after trying to login
 *
 * @returns Promise of UserCredential
 */
async function linkWithFBCredentialFromAuthError(error: unknown) {
  // credential is not null since this function is called after an auth/account-exists-with-different-credential error, ie credentials actually exist
  const credentials = OAuthProvider.credentialFromError(error as AuthError)!

  const otherLinkedProviders = (
    await getSignInMethodsForEmail((error as AuthError).customData.email!)
  ).filter((providerId) => credentials.providerId !== providerId)

  let user: FBUser | null = null

  if (otherLinkedProviders.indexOf("google.com") >= -1) {
    user = (await signInUserWithGoogleFB()).user
  } else if (otherLinkedProviders.indexOf("github.com") >= -1) {
    user = (await signInUserWithGithubFB()).user
  } else if (otherLinkedProviders.indexOf("microsoft.com") >= -1) {
    user = (await signInUserWithMicrosoftFB()).user
  }

  // user is not null since going through each provider will return a user
  return await linkWithCredential(user!, credentials)
}

async function setProviderInfo(id: string, token: string) {
  if (!currentUser$.value) throw new Error("No user has logged in")

  const us = {
    updatedOn: new Date(),
    provider: id,
    accessToken: token,
  }

  try {
    await updateDoc(doc(getFirestore(), "users", currentUser$.value.uid), us)
  } catch (e) {
    console.error("error updating provider info", e)
    throw e
  }
}

async function getSignInMethodsForEmail(email: string) {
  return await fetchSignInMethodsForEmail(getAuth(), email)
}

export const def: AuthPlatformDef = {
  getCurrentUserStream: () => currentUser$,
  getAuthEventsStream: () => authEvents$,
  getProbableUserStream: () => probableUser$,

  getCurrentUser: () => currentUser$.value,
  getProbableUser: () => probableUser$.value,

  getBackendHeaders() {
    return {
      authorization: `Bearer ${authIdToken$.value}`,
    }
  },
  willBackendHaveAuthError() {
    return !authIdToken$.value
  },
  onBackendGQLClientShouldReconnect(func) {
    authIdToken$.subscribe(() => {
      func()
    })
  },
  getDevOptsBackendIDToken() {
    return authIdToken$.value
  },
  performAuthInit() {
    // todo: implement
    const auth = getAuth()
    const firestore = getFirestore()

    combineLatest([currentUserFB$, authIdToken$])
      .pipe(
        map(([user, token]) => {
          // If there is no auth token, we will just consider as the auth as not complete
          if (token === null) return null
          if (user !== null) return fbUserToHoppUser(user)
          return null
        })
      )
      .subscribe((x) => {
        currentUser$.next(x)
      })

    let extraSnapshotStop: (() => void) | null = null

    probableUser$.next(JSON.parse(getLocalConfig("login_state") ?? "null"))

    onAuthStateChanged(auth, (user) => {
      const wasLoggedIn = currentUser$.value !== null

      if (user) {
        probableUser$.next(user)
      } else {
        probableUser$.next(null)
        removeLocalConfig("login_state")
      }

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

            const userUpdate: HoppUser = fbUserToHoppUser(user)

            if (data) {
              // Write extra provider data
              userUpdate.provider = data.provider
              userUpdate.accessToken = data.accessToken
            }

            currentUser$.next(userUpdate)
          }
        )
      }

      currentUserFB$.next(user)
      currentUser$.next(user === null ? null : fbUserToHoppUser(user))

      // User wasn't found before, but now is there (login happened)
      if (!wasLoggedIn && user) {
        authEvents$.next({
          event: "login",
          user: currentUser$.value!,
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

        setLocalConfig("login_state", JSON.stringify(user))
      } else {
        authIdToken$.next(null)
      }
    })
  },

  waitProbableLoginToConfirm() {
    return new Promise<void>((resolve, reject) => {
      if (authIdToken$.value) resolve()

      if (!probableUser$.value) reject(new Error("no_probable_user"))

      let sub: Subscription | null = null
      sub = authIdToken$.pipe(filter((token) => !!token)).subscribe(() => {
        sub?.unsubscribe()
        resolve()
      })
    })
  },

  async signInWithEmail(email: string) {
    return await sendSignInLinkToEmail(
      getAuth(),
      email,
      EMAIL_ACTION_CODE_SETTINGS
    )
  },

  isSignInWithEmailLink(url: string) {
    return isSignInWithEmailLinkFB(getAuth(), url)
  },

  async verifyEmailAddress() {
    if (!currentUserFB$.value) throw new Error("No user has logged in")

    try {
      await sendEmailVerification(currentUserFB$.value)
    } catch (e) {
      console.error("error verifying email address", e)
      throw e
    }
  },
  async signInUserWithGoogle() {
    await signInUserWithGoogleFB()
  },
  async signInUserWithGithub() {
    try {
      const cred = await signInUserWithGithubFB()
      const oAuthCred = GithubAuthProvider.credentialFromResult(cred)!
      const token = oAuthCred.accessToken
      await setProviderInfo(cred.providerId!, token!)

      return {
        type: "success",
        user: fbUserToHoppUser(cred.user),
      }
    } catch (e) {
      console.error("error while logging in with github", e)

      if ((e as any).code === "auth/account-exists-with-different-credential") {
        return {
          type: "account-exists-with-different-cred",
          link: async () => {
            await linkWithFBCredentialFromAuthError(e)
          },
        }
      } else {
        return {
          type: "error",
          err: e,
        }
      }
    }
  },
  async signInUserWithMicrosoft() {
    await signInUserWithMicrosoftFB()
  },
  async signInWithEmailLink(email: string, url: string) {
    await signInWithEmailLinkFB(getAuth(), email, url)
  },
  async setEmailAddress(email: string) {
    if (!currentUserFB$.value) throw new Error("No user has logged in")

    try {
      await updateEmail(currentUserFB$.value, email)
    } catch (e) {
      await reauthenticateUser()
      console.log("error setting email address", e)
      throw e
    }
  },
  async setDisplayName(name: string) {
    if (!currentUserFB$.value) throw new Error("No user has logged in")

    const us = {
      displayName: name,
    }

    try {
      await updateProfile(currentUserFB$.value, us)
    } catch (e) {
      console.error("error updating display name", e)
      throw e
    }
  },
  async signOutUser() {
    if (!currentUser$.value) throw new Error("No user has logged in")

    await signOut(getAuth())
  },
  async processMagicLink() {
    if (this.isSignInWithEmailLink(window.location.href)) {
      let email = getLocalConfig("emailForSignIn")

      if (!email) {
        email = window.prompt(
          "Please provide your email for confirmation"
        ) as string
      }

      await signInWithEmailLink(email, window.location.href)

      removeLocalConfig("emailForSignIn")
      window.location.href = "/"
    }
  },
}
