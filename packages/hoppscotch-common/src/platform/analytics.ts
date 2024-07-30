export type HoppRequestEvent =
  | {
      platform: "rest"
      strategy: string
      workspaceType: "personal" | "team"
    }
  | {
      platform: "graphql-query" | "graphql-schema"
      strategy: string
    }
  | { platform: "wss" | "sse" | "socketio" | "mqtt" }

export type HoppSpotlightSessionEventData = {
  action?: "success" | "close"
  inputLength?: number
  method?: "keyboard-shortcut" | "click-spotlight-bar"
  rank?: string | null
  searcherID?: string | null
  sessionDuration?: string
}

export type AnalyticsEvent =
  | ({ type: "HOPP_REQUEST_RUN" } & HoppRequestEvent)
  | {
      type: "HOPP_CREATE_ENVIRONMENT"
      workspaceType: "personal" | "team"
    }
  | {
      type: "HOPP_CREATE_COLLECTION"
      platform: "rest" | "gql"
      isRootCollection: boolean
      workspaceType: "personal" | "team"
    }
  | { type: "HOPP_CREATE_TEAM" }
  | {
      type: "HOPP_SAVE_REQUEST"
      createdNow: boolean
      workspaceType: "personal" | "team"
      platform: "rest" | "gql"
    }
  | { type: "HOPP_SHORTCODE_CREATED" }
  | { type: "HOPP_SHORTCODE_RESOLVED" }
  | { type: "HOPP_REST_NEW_TAB_OPENED" }
  | {
      type: "HOPP_IMPORT_COLLECTION"
      importer: string
      workspaceType: "personal" | "team"
      platform: "rest" | "gql"
    }
  | {
      type: "HOPP_IMPORT_ENVIRONMENT"
      workspaceType: "personal" | "team"
      platform: "rest" | "gql"
    }
  | {
      type: "HOPP_EXPORT_COLLECTION"
      exporter: string
      platform: "rest" | "gql"
    }
  | { type: "HOPP_EXPORT_ENVIRONMENT"; platform: "rest" | "gql" }
  | { type: "HOPP_REST_CODEGEN_OPENED" }
  | { type: "HOPP_REST_IMPORT_CURL" }
  | ({
      type: "HOPP_SPOTLIGHT_SESSION"
    } & HoppSpotlightSessionEventData)
  | {
      type: "EXPERIMENTS_GENERATE_REQUEST_NAME_WITH_AI"
      platform: "rest" | "gql"
    }

export type AnalyticsPlatformDef = {
  initAnalytics: () => void
  logEvent: (ev: AnalyticsEvent) => void
  logPageView: (pagePath: string) => void
}
