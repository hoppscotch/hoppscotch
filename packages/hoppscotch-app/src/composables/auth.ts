import { currentUser$, HoppUser } from "@helpers/fb/auth"
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
