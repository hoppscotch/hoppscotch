import { HoppModule } from "."
import * as Sentry from "@sentry/vue"
import { BrowserTracing } from "@sentry/tracing"
import { Route } from "@sentry/vue/types/router"
import { RouteLocationNormalized, Router } from "vue-router"
import { settingsStore } from "~/newstore/settings"
import { App } from "vue"
import { APP_IS_IN_DEV_MODE } from "~/helpers/dev"

interface SentryVueRouter {
  onError: (fn: (err: Error) => void) => void
  beforeEach: (fn: (to: Route, from: Route, next: () => void) => void) => void
}

function normalizedRouteToSentryRoute(route: RouteLocationNormalized): Route {
  return {
    matched: route.matched,
    // route.params' type translates just to a fancy version of this, hence assertion
    params: route.params as Route["params"],
    path: route.path,
    // route.query's type translates just to a fancy version of this, hence assertion
    query: route.query as Route["query"],
    name: route.name,
  }
}

function getInstrumentationVueRouter(router: Router): SentryVueRouter {
  return <SentryVueRouter>{
    onError: router.onError,
    beforeEach(func) {
      router.beforeEach((to, from, next) => {
        func(
          normalizedRouteToSentryRoute(to),
          normalizedRouteToSentryRoute(from),
          next
        )
      })
    },
  }
}

let sentryActive = false

function initSentry(dsn: string, router: Router, app: App) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: APP_IS_IN_DEV_MODE
      ? "dev"
      : import.meta.env.VITE_SENTRY_ENVIRONMENT,
    integrations: [
      new BrowserTracing({
        routingInstrumentation: Sentry.vueRouterInstrumentation(
          getInstrumentationVueRouter(router)
        ),
        // TODO: We may want to limit this later on
        tracingOrigins: [new URL(import.meta.env.VITE_BACKEND_GQL_URL).origin],
      }),
    ],
    tracesSampleRate: 0.8,
  })
  sentryActive = true
}

function deinitSentry() {
  Sentry.close()
  sentryActive = false
}

export default <HoppModule>{
  onRouterInit(app, router) {
    if (!import.meta.env.VITE_SENTRY_DSN) {
      console.log(
        "Sentry tracing is not enabled because 'VITE_SENTRY_DSN' env is not defined"
      )
      return
    }

    if (settingsStore.value.TELEMETRY_ENABLED) {
      initSentry(import.meta.env.VITE_SENTRY_DSN, router, app)
    }

    settingsStore.subject$.subscribe(({ TELEMETRY_ENABLED }) => {
      if (!TELEMETRY_ENABLED && sentryActive) {
        deinitSentry()
      } else if (TELEMETRY_ENABLED && !sentryActive) {
        initSentry(import.meta.env.VITE_SENTRY_DSN!, router, app)
      }
    })
  },
}
