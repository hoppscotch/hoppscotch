import { GQLHeader, HoppGQLAuth } from "@hoppscotch/data"
import { z } from "zod"

const ThemeColorSchema = z.enum([
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "yellow",
  "orange",
  "red",
  "pink",
])

const BgColorSchema = z.enum(["system", "light", "dark", "black"])

const SettingsDefSchema = z.object({
  syncCollections: z.boolean(),
  syncHistory: z.boolean(),
  syncEnvironments: z.boolean(),
  PROXY_URL: z.string(),
  CURRENT_INTERCEPTOR_ID: z.string(),
  URL_EXCLUDES: z.object({
    auth: z.boolean(),
    httpUser: z.boolean(),
    httpPassword: z.boolean(),
    bearerToken: z.boolean(),
    oauth2Token: z.boolean(),
  }),
  THEME_COLOR: ThemeColorSchema,
  BG_COLOR: BgColorSchema,
  TELEMETRY_ENABLED: z.boolean(),
  EXPAND_NAVIGATION: z.boolean(),
  SIDEBAR: z.boolean(),
  SIDEBAR_ON_LEFT: z.boolean(),
  COLUMN_LAYOUT: z.boolean(),
})

export const VUEX_SCHEMA = z.object({
  postwoman: z.optional(
    z.object({
      settings: z.optional(SettingsDefSchema),
      //! Versioned entities
      // collections: z.optional(z.array(HoppCollectionSchema)),
      // collectionsGraphql: z.optional(z.array(HoppCollectionSchema)),
      // environments: z.optional(z.array(EnvironmentSchema)),
    })
  ),
})

export const REST_HISTORY_ENTRY_SCHEMA = z
  .object({
    v: z.number(),
    //! Versioned entity
    // request: HoppRESTRequestSchema,
    responseMeta: z
      .object({
        duration: z.number().nullable(),
        statusCode: z.number().nullable(),
      })
      .strict(),
    star: z.boolean(),
    id: z.string().optional(),
    updatedOn: z.date().optional(),
  })
  .strict()

export const GQL_HISTORY_ENTRY_SCHEMA = z
  .object({
    v: z.number(),
    //! Versioned entity
    // request: HoppGQLRequestSchema,
    response: z.string(),
    star: z.boolean(),
    id: z.string().optional(),
    updatedOn: z.date().optional(),
  })
  .strict()

// @ts-expect-error recursive schema
export const REST_COLLECTION_SCHEMA = z.object({
  v: z.number(),
  name: z.string(),
  folders: z.lazy(() => z.array(REST_COLLECTION_SCHEMA)),
  //! Versioned entity
  // requests: z.array(HoppRESTRequestSchema),
  id: z.string().optional(),
})

// @ts-expect-error recursive schema
export const GQL_COLLECTION_SCHEMA = z.object({
  v: z.number(),
  name: z.string(),
  folders: z.lazy(() => z.array(GQL_COLLECTION_SCHEMA)),
  //! Versioned entity
  // requests: z.array(HoppGQLRequestSchema),
  id: z.string().optional(),
})

export const SELECTED_ENV_INDEX_SCHEMA = z.nullable(
  z.union([
    z
      .object({
        type: z.literal("NO_ENV_SELECTED"),
      })
      .strict(),
    z
      .object({
        type: z.literal("MY_ENV"),
        index: z.number(),
      })
      .strict(),
    z.object({
      type: z.literal("MY_ENV"),
      teamID: z.string(),
      teamEnvID: z.string(),
      // ! Versioned entity
      // environment: Environment
    }),
  ])
)

export const WEBSOCKET_REQUEST_SCHEMA = z.nullable(
  z
    .object({
      endpoint: z.string(),
      protocols: z.array(
        z
          .object({
            value: z.string(),
            active: z.boolean(),
          })
          .strict()
      ),
    })
    .strict()
)

export const SOCKET_IO_REQUEST_SCHEMA = z.nullable(
  z
    .object({
      endpoint: z.string(),
      path: z.string(),
      version: z.union([z.literal("v4"), z.literal("v3"), z.literal("v2")]),
    })
    .strict()
)

export const SSE_REQUEST_SCHEMA = z.nullable(
  z
    .object({
      endpoint: z.string(),
      eventType: z.string(),
    })
    .strict()
)

export const MQTT_REQUEST_SCHEMA = z.nullable(
  z
    .object({
      endpoint: z.string(),
      clientID: z.string(),
    })
    .strict()
)

export const GLOBAL_ENV_SCHEMA = z.union([
  z.array(z.never()),
  z.array(
    z
      .object({
        key: z.string(),
        value: z.string(),
      })
      .strict()
  ),
])

const OperationTypeSchema = z.enum([
  "subscription",
  "query",
  "mutation",
  "teardown",
])

const RunQueryOptionsSchema = z
  .object({
    name: z.optional(z.string()),
    url: z.string(),
    headers: z.array(GQLHeader),
    query: z.string(),
    variables: z.string(),
    auth: HoppGQLAuth,
    operationName: z.optional(z.string()),
    operationType: OperationTypeSchema,
  })
  .strict()

const HoppGQLSaveContextSchema = z.nullable(
  z.discriminatedUnion("originLocation", [
    z
      .object({
        originLocation: z.literal("user-collection"),
        folderPath: z.string(),
        requestIndex: z.number(),
      })
      .strict(),
    z
      .object({
        originLocation: z.literal("team-collection"),
        requestID: z.string(),
        teamID: z.optional(z.string()),
        collectionID: z.optional(z.string()),
      })
      .strict(),
  ])
)

const GQLResponseEventSchema = z.array(
  z
    .object({
      time: z.number(),
      operationName: z.optional(z.string()),
      operationType: OperationTypeSchema,
      data: z.string(),
      rawQuery: z.optional(RunQueryOptionsSchema),
    })
    .strict()
)

const validGqlOperations = [
  "query",
  "headers",
  "variables",
  "authorization",
] as const

export const GQL_TAB_STATE_SCHEMA = z
  .object({
    lastActiveTabID: z.string(),
    orderedDocs: z.array(
      z.object({
        tabID: z.string(),
        doc: z
          .object({
            // Versioned entity
            // request: HoppGQLRequest
            isDirty: z.boolean(),
            saveContext: z.optional(HoppGQLSaveContextSchema),
            response: z.optional(z.nullable(GQLResponseEventSchema)),
            responseTabPreference: z.optional(z.string()),
            optionTabPreference: z.optional(z.enum(validGqlOperations)),
          })
          .strict(),
      })
    ),
  })
  .strict()

const HoppTestExpectResultSchema = z
  .object({
    status: z.enum(["fail", "pass", "error"]),
    message: z.string(),
  })
  .strict()

// @ts-expect-error recursive schema
const HoppTestDataSchema = z.lazy(() =>
  z
    .object({
      description: z.string(),
      expectResults: z.array(HoppTestExpectResultSchema),
      tests: z.array(HoppTestDataSchema),
    })
    .strict()
)

const EnvironmentVariablesSchema = z
  .object({
    key: z.string(),
    value: z.string(),
  })
  .strict()

const HoppTestResultSchema = z
  .object({
    tests: z.array(HoppTestDataSchema),
    expectResults: z.array(HoppTestExpectResultSchema),
    description: z.string(),
    scriptError: z.boolean(),
    envDiff: z
      .object({
        global: z
          .object({
            additions: z.array(EnvironmentVariablesSchema),
            updations: z.array(
              EnvironmentVariablesSchema.extend({ previousValue: z.string() })
            ),
            deletions: z.array(EnvironmentVariablesSchema),
          })
          .strict(),
        selected: z
          .object({
            additions: z.array(EnvironmentVariablesSchema),
            updations: z.array(
              EnvironmentVariablesSchema.extend({ previousValue: z.string() })
            ),
            deletions: z.array(EnvironmentVariablesSchema),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()

const HoppRESTResponseHeaderSchema = z
  .object({
    key: z.string(),
    value: z.string(),
  })
  .strict()

const HoppRESTResponseSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("loading"),
      // !Versioned entity
      // req: HoppRESTRequestSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("fail"),
      headers: z.array(HoppRESTResponseHeaderSchema),
      body: z.instanceof(ArrayBuffer),
      statusCode: z.number(),
      meta: z
        .object({
          responseSize: z.number(),
          responseDuration: z.number(),
        })
        .strict(),
      // !Versioned entity
      // req: HoppRESTRequestSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("network_fail"),
      error: z.unknown(),
      // !Versioned entity
      // req: HoppRESTRequestSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("script_fail"),
      error: z.instanceof(Error),
    })
    .strict(),
  z
    .object({
      type: z.literal("success"),
      headers: z.array(HoppRESTResponseHeaderSchema),
      body: z.instanceof(ArrayBuffer),
      statusCode: z.number(),
      meta: z
        .object({
          responseSize: z.number(),
          responseDuration: z.number(),
        })
        .strict(),
      // !Versioned entity
      // req: HoppRESTRequestSchema,
    })
    .strict(),
])

const HoppRESTSaveContextSchema = z.nullable(
  z.discriminatedUnion("originLocation", [
    z
      .object({
        originLocation: z.literal("user-collection"),
        folderPath: z.string(),
        requestIndex: z.number(),
      })
      .strict(),
    z
      .object({
        originLocation: z.literal("team-collection"),
        requestID: z.string(),
        teamID: z.optional(z.string()),
        collectionID: z.optional(z.string()),
      })
      .strict(),
  ])
)

const validRestOperations = [
  "params",
  "bodyParams",
  "headers",
  "authorization",
  "preRequestScript",
  "tests",
] as const

export const REST_TAB_STATE_SCHEMA = z
  .object({
    lastActiveTabID: z.string(),
    orderedDocs: z.array(
      z.object({
        tabID: z.string(),
        doc: z
          .object({
            // !Versioned entity
            // request: HoppRESTRequest,
            isDirty: z.boolean(),
            saveContext: z.optional(HoppRESTSaveContextSchema),
            response: z.optional(z.nullable(HoppRESTResponseSchema)),
            testResults: z.nullable(HoppTestResultSchema),
            responseTabPreference: z.optional(z.string()),
            optionTabPreference: z.optional(z.enum(validRestOperations)),
          })
          .strict(),
      })
    ),
  })
  .strict()
