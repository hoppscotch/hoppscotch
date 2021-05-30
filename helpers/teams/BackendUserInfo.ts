import { BehaviorSubject } from "rxjs"
import gql from "graphql-tag"
import { fb } from "../fb"
import { apolloClient } from "../apollo"

/*
 * This file deals with interfacing data provided by the
 * Hoppscotch Backend server
 */

/**
 * Defines the information provided about a user
 */
interface UserInfo {
  /**
   * UID of the user
   */
  uid: string
  /**
   * Displayable name of the user (or null if none available)
   */
  displayName: string | null
  /**
   * Email of the user (or null if none available)
   */
  email: string | null
  /**
   * URL to the profile photo of the user (or null if none available)
   */
  photoURL: string | null
  /**
   * Whether the user has access to Early Access features
   */
  eaInvited: boolean
}

/**
 * An observable subject onto the currently logged in user info (is null if not logged in)
 */
export const currentUserInfo$ = new BehaviorSubject<UserInfo | null>(null)

/**
 * Initializes the currenUserInfo$ view and sets up its update mechanism
 */
export async function initUserInfo() {
  if (fb.idToken) await updateUserInfo()

  fb.idToken$.subscribe((token) => {
    if (token) {
      updateUserInfo()
    } else {
      currentUserInfo$.next(null)
    }
  })
}

/**
 * Runs the actual user info fetching
 */
async function updateUserInfo() {
  try {
    const { data } = await apolloClient.query({
      query: gql`
        query GetUserInfo {
          me {
            uid
            displayName
            email
            photoURL
            eaInvited
          }
        }
      `,
    })

    currentUserInfo$.next({
      uid: data.me.uid,
      displayName: data.me.displayName,
      email: data.me.email,
      photoURL: data.me.photoURL,
      eaInvited: data.me.eaInvited,
    })
  } catch (e) {
    currentUserInfo$.next(null)
  }
}
