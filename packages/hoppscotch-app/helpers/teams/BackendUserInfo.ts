import { BehaviorSubject } from "rxjs"
import gql from "graphql-tag"
import { authIdToken$ } from "../fb/auth"
import { apolloClient } from "../apollo"

/*
 * This file deals with interfacing data provided by the
 * Hoppscotch Backend server
 */

/**
 * Defines the information provided about a user
 */
export interface UserInfo {
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
}

/**
 * An observable subject onto the currently logged in user info (is null if not logged in)
 */
export const currentUserInfo$ = new BehaviorSubject<UserInfo | null>(null)

/**
 * Initializes the currenUserInfo$ view and sets up its update mechanism
 */
export function initUserInfo() {
  authIdToken$.subscribe((token) => {
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
          }
        }
      `,
    })

    currentUserInfo$.next({
      uid: data.me.uid,
      displayName: data.me.displayName,
      email: data.me.email,
      photoURL: data.me.photoURL,
    })
  } catch (e) {
    currentUserInfo$.next(null)
  }
}
