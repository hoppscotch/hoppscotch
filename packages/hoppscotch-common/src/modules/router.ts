import { HoppModule, HOPP_MODULES } from "."
import {
  createRouter,
  createWebHistory,
  RouteLocationNormalized,
} from "vue-router"
import { setupLayouts } from "virtual:generated-layouts"
import generatedRoutes from "virtual:generated-pages"
import { readonly, ref } from "vue"
import { platform } from "~/platform"

const routes = setupLayouts(generatedRoutes)

/**
 * A reactive value signifying whether we are currently navigating
 * into the first route the application is routing into.
 * Useful, if you want to do stuff for the initial page load (for example splash screens!)
 */
const _isLoadingInitialRoute = ref(false)

/**
 * Says whether a given route looks like an initial route which
 * is loaded as the first route.
 *
 * NOTE: This function assumes Vue Router represents that initial route
 * in the way we expect (fullPath == "/" and name == undefined). If this
 * function breaks later on, most probs vue-router updated its semantics
 * and we have to correct this function.
 */
function isInitialRoute(route: RouteLocationNormalized) {
  return route.fullPath === "/" && route.name === undefined
}

/**
 * A reactive value signifying whether we are currently navigating
 * into the first route the application is routing into.
 * Useful, if you want to do stuff for the initial page load (for example splash screens!)
 *
 * NOTE: This reactive value is READONLY
 */
export const isLoadingInitialRoute = readonly(_isLoadingInitialRoute)

export default <HoppModule>{
  onVueAppInit(app) {
    const router = createRouter({
      history: createWebHistory(),
      routes,
    })

    // on desktop, org webviews carry their context as ?org= in the URL
    // (e.g. app://hoppscotch/?org=test-org.hoppscotch.io). Vue Router
    // strips query params during internal navigation, so we capture the
    // initial ?org= value and re-inject it into every subsequent route.
    // this is the single source of truth for org context on desktop,
    // replacing the previous window.__HOPPSCOTCH_ORG__ global approach.
    const initialOrgParam = new URLSearchParams(window.location.search).get(
      "org"
    )

    router.beforeEach(async (to, from) => {
      // preserve the ?org= query param across all route transitions.
      // the param originates from the Rust load command which sets it
      // on the initial webview URL. without this guard, navigating to
      // /orgs/login-required and then calling window.location.reload()
      // would lose the org context.
      if (initialOrgParam && !to.query.org) {
        return {
          path: to.path,
          hash: to.hash,
          params: to.params,
          query: { ...to.query, org: initialOrgParam },
        }
      }

      _isLoadingInitialRoute.value = isInitialRoute(from)

      const onBeforeRouteChangePromises: Promise<any>[] = []

      HOPP_MODULES.forEach((mod) => {
        const res = mod.onBeforeRouteChange?.(to, from, router)
        if (res) onBeforeRouteChangePromises.push(res)
      })
      platform.addedHoppModules?.forEach((mod) => {
        const res = mod.onBeforeRouteChange?.(to, from, router)
        if (res) onBeforeRouteChangePromises.push(res)
      })

      await Promise.all(onBeforeRouteChangePromises)
    })

    // Instead of this a better architecture is for the router
    // module to expose a stream of router events that can be independently
    // subbed to
    router.afterEach((to) => {
      platform.analytics?.logPageView(to.fullPath)

      _isLoadingInitialRoute.value = false

      HOPP_MODULES.forEach((mod) => {
        mod.onAfterRouteChange?.(to, router)
      })
      platform.addedHoppModules?.forEach((mod) => {
        mod.onAfterRouteChange?.(to, router)
      })
    })

    app.use(router)

    HOPP_MODULES.forEach((mod) => mod.onRouterInit?.(app, router))
    platform.addedHoppModules?.forEach((mod) => mod.onRouterInit?.(app, router))
  },
}
