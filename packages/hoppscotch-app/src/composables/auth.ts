import {
  currentUser$,
  HoppUser,
  AuthEvent,
  authEvents$,
} from "@helpers/fb/auth"
import { map, distinctUntilChanged, filter, Subscription } from "rxjs"
import { onBeforeUnmount, onMounted } from "vue"

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

/**
 * A Vue composable function that calls its param function
 * when a new event (login, logout etc.) happens in
 * the auth system.
 *
 * NOTE: Unlike `onLoggedIn` for which the callback will be called once on mount with the current state,
 * here the callback will only be called on authentication event occurances.
 * You might want to check the auth state from an `onMounted` hook or something
 * if you want to access the initial state
 *
 * @param func A function which accepts an event
 */
export function onAuthEvent(func: (ev: AuthEvent) => void) {
  let sub: Subscription | null = null

  onMounted(() => {
    sub = authEvents$.subscribe((ev) => {
      func(ev)
    })
  })

  onBeforeUnmount(() => {
    sub?.unsubscribe()
  })
}
