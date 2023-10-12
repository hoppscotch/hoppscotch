import { RouteLocationNormalized, Router } from "vue-router"

export type SentryRouterPlatformDef = {
  routeLocationNormalized: RouteLocationNormalized
  router: Router
}
