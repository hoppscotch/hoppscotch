import { HoppModule } from "."
import * as Sentry from "@sentry/vue"
import { BrowserTracing } from "@sentry/tracing"
import { Route } from "@sentry/vue/types/router"
import { RouteLocationNormalized, Router } from "vue-router"
import { settingsStore } from "~/newstore/settings"
import { App } from "vue"
import { APP_IS_IN_DEV_MODE } from "~/helpers/dev"
import { gqlClientError$ } from "~/helpers/backend/GQLClient"
import { platform } from "~/platform"

/**
 * The tag names we allow giving to Sentry
 */
type SentryTag = "BACKEND_OPERATIONS"

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
    dsn,
    release: import.meta.env.VITE_SENTRY_RELEASE_TAG ?? undefined,
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

/**
 * Reports a set of related errors to Sentry
 * @param errs The errors to report
 * @param tag The tag for the errord
 * @param extraTags Additional tag data to add
 * @param extras Extra information to attach
 */
function reportErrors(
  errs: Error[],
  tag: SentryTag,
  extraTags: Record<string, string | number | boolean> | null = null,
  extras: any = undefined
) {
  if (sentryActive) {
    Sentry.withScope((scope) => {
      scope.setTag("tag", tag)
      if (extraTags) {
        Object.entries(extraTags).forEach(([key, value]) => {
          scope.setTag(key, value)
        })
      }
      if (extras !== null && extras === undefined) scope.setExtras(extras)

      scope.addAttachment({
        filename: "extras-dump.json",
        data: JSON.stringify(extras),
        contentType: "application/json",
      })

      errs.forEach((err) => Sentry.captureException(err))
    })
  }
}

/**
 * Reports a specific error to Sentry
 * @param err The error to report
 * @param tag The tag for the error
 * @param extraTags Additional tag data to add
 * @param extras Extra information to attach
 */
function reportError(
  err: Error,
  tag: SentryTag,
  extraTags: Record<string, string | number | boolean> | null = null,
  extras: any = undefined
) {
  reportErrors([err], tag, extraTags, extras)
}

/**
 * Subscribes to events occuring in various subsystems in the app
 * for personalized error reporting
 */
function subscribeToAppEventsForReporting() {
  gqlClientError$.subscribe((ev) => {
    switch (ev.type) {
      case "SUBSCRIPTION_CONN_CALLBACK_ERR_REPORT":
        reportErrors(ev.errors, "BACKEND_OPERATIONS", { from: ev.type })
        break

      case "CLIENT_REPORTED_ERROR":
        reportError(
          ev.error,
          "BACKEND_OPERATIONS",
          { from: ev.type },
          { op: ev.op }
        )
        break

      case "GQL_CLIENT_REPORTED_ERROR":
        reportError(
          new Error("Backend Query Failed"),
          "BACKEND_OPERATIONS",
          { opType: ev.opType },
          {
            opResult: ev.opResult,
          }
        )
        break
    }
  })
}

/**
 * Subscribe to app system events for adding
 * additional data tags for the error reporting
 */
function subscribeForAppDataTags() {
  const currentUser$ = platform.auth.getCurrentUserStream()

  currentUser$.subscribe((user) => {
    if (sentryActive) {
      Sentry.setTag("user_logged_in", !!user)
    }
  })
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

    subscribeToAppEventsForReporting()
    subscribeForAppDataTags()
  },
}
