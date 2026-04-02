import { HoppModule } from "."
import { platform } from "~/platform"
import { AuthEvent } from "~/platform/auth"

/**
 * Whether authentication is required to access the app.
 * Configured via VITE_REQUIRE_AUTH environment variable (server-side).
 * This cannot be bypassed by users as it's baked into the build.
 */
const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH === "true"

/**
 * Route path prefixes that are accessible without authentication.
 * Every other route requires the user to be logged in
 * (when VITE_REQUIRE_AUTH is enabled).
 *
 *   /enter   – magic-link / email sign-in landing
 *   /oauth   – per-request OAuth callback (not user auth)
 *   /e/      – embed view         (pages/e/_id.vue)
 *   /view/   – shared req view    (pages/view/_id/_version.vue)
 *   /r/      – short-link         (pages/r/_id.vue)
 */
const PUBLIC_PREFIXES = ["/enter", "/oauth", "/e/", "/view/", "/r/"]

const isPublicPath = (path: string): boolean =>
  PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))

export default <HoppModule>{
  onRouterInit(_app, router) {
    // ─── Navigation guard ───────────────────────────────────────────────
    router.beforeEach(async (to) => {
      // If the feature is disabled, allow all navigations freely.
      if (!REQUIRE_AUTH) return true

      // Wait for the probable-login confirmation so we never flash-redirect
      // a logged-in user to /enter on a hard reload.
      await platform.auth.waitProbableLoginToConfirm()

      const isAuthenticated = platform.auth.getCurrentUser() !== null

      // Authenticated user opening the login page → go home.
      if (isAuthenticated && to.path === "/enter") {
        return { path: "/" }
      }

      // Unauthenticated user opening a protected page → go to login.
      if (!isAuthenticated && !isPublicPath(to.path)) {
        return {
          path: "/enter",
          query: to.fullPath !== "/" ? { redirect: to.fullPath } : undefined,
        }
      }

      return true
    })

    // ─── Post-login redirect ─────────────────────────────────────────────
    // When the user completes login while sitting on /enter, push them to
    // the originally requested page (preserved in ?redirect=) or home.
    // Note: Subscription lives for the app's lifetime; stored for idiomatic RxJS.
    const _loginSub = platform.auth.getAuthEventsStream().subscribe((event: AuthEvent) => {
      if (!REQUIRE_AUTH) return
      if (event.event !== "login") return

      const currentRoute = router.currentRoute.value
      if (currentRoute.path !== "/enter") return

      const redirectTo =
        typeof currentRoute.query.redirect === "string" &&
        currentRoute.query.redirect.startsWith("/")
          ? currentRoute.query.redirect
          : "/"

      router.push(redirectTo)
    })
  },
}
