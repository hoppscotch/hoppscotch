export type HoppRequestEvent =
  | {
      platform: "rest" | "graphql-query" | "graphql-schema"
      strategy: "normal" | "proxy" | "extension"
    }
  | { platform: "wss" | "sse" | "socketio" | "mqtt" }

export type AnalyticsPlatformDef = {
  initAnalytics: () => void
  logHoppRequestRunToAnalytics: (ev: HoppRequestEvent) => void
  logPageView: (pagePath: string) => void
}
