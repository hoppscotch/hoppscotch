import { pipe } from "fp-ts/function"
import * as E from "fp-ts/Either"
import { BehaviorSubject } from "rxjs"
import { authIdToken$ } from "../fb/auth"
import { runGQLQuery } from "../backend/GQLClient"
import { GetUserInfoDocument } from "../backend/graphql"

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
  const result = await runGQLQuery({
    query: GetUserInfoDocument,
  })

  currentUserInfo$.next(
    pipe(
      result,
      E.matchW(
        () => null,
        (x) => ({
          uid: x.me.uid,
          displayName: x.me.displayName ?? null,
          email: x.me.email ?? null,
          photoURL: x.me.photoURL ?? null,
        })
      )
    )
  )
}
