import { platform } from "~/platform"
import { AuthEvent, HoppUser } from "~/platform/auth"
import { Subscription } from "rxjs"
import { onBeforeUnmount, onMounted, watch, WatchStopHandle } from "vue"
import { useReadonlyStream } from "./stream"

/**
 * A Vue composable function that is called when the auth status
 * is being updated to being logged in (fired multiple times),
 * this is also called on component mount if the login
 * was already resolved before mount.
 */
export function onLoggedIn(exec: (user: HoppUser) => void) {
  const currentUser = useReadonlyStream(
    platform.auth.getCurrentUserStream(),
    platform.auth.getCurrentUser()
  )

  let watchStop: WatchStopHandle | null = null

  onMounted(() => {
    if (currentUser.value) exec(currentUser.value)

    watchStop = watch(currentUser, (newVal, prev) => {
      if (prev === null && newVal !== null) {
        exec(newVal)
      }
    })
  })

  onBeforeUnmount(() => {
    watchStop?.()
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
  const authEvents$ = platform.auth.getAuthEventsStream()

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
