import { Observable } from "rxjs"

export type HoppUser = {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null

  provider?: string
  accessToken?: string
}

export type AuthEvent =
  | { event: "probable_login"; user: HoppUser } // We have previous login state, but the app is waiting for authentication
  | { event: "login"; user: HoppUser } // We are authenticated
  | { event: "logout" } // No authentication and we have no previous state

export type GithubSignInResult =
  | { type: "success"; user: HoppUser }
  | { type: "account-exists-with-different-cred"; link: () => Promise<void> }
  | { type: "error"; err: unknown }

export type AuthPlatformDef = {
  getCurrentUserStream: () => Observable<HoppUser | null>
  // getAuthIdTokenStream: () => Observable<string | null>
  getAuthEventsStream: () => Observable<AuthEvent>
  getProbableUserStream: () => Observable<HoppUser | null>

  getCurrentUser: () => HoppUser | null
  getProbableUser: () => HoppUser | null

  performAuthInit: () => void

  // getAuthIDToken: () => string | null

  getBackendHeaders: () => Record<string, string>
  willBackendHaveAuthError: () => boolean
  onBackendGQLClientShouldReconnect: (func: () => void) => void

  getDevOptsBackendIDToken: () => string | null

  waitProbableLoginToConfirm: () => Promise<void>

  signInWithEmail: (email: string) => Promise<void>
  isSignInWithEmailLink: (url: string) => boolean
  verifyEmailAddress: () => Promise<void>

  signInUserWithGoogle: () => Promise<HoppUser>
  signInUserWithGithub: () => Promise<GithubSignInResult>
  signInUserWithMicrosoft: () => Promise<HoppUser>

  getSignInMethodsForEmail: (email: string) => Promise<string[]>

  signOutUser: () => Promise<void>

  setEmailAddress: (email: string) => Promise<void>
  setDisplayName: (name: string) => Promise<void>
  setProviderInfo: (id: string, token: string) => Promise<void>
}
