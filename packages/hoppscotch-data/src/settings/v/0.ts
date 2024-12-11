import { z } from "zod"
import { defineVersion } from "verzod"

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

const EncodeMode = z.enum(["enable", "disable", "auto"])

export const V0_SCHEMA = z.object({
  v: z.literal(0),
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
    oauth2Token: z.optional(z.boolean()),
  }),
  THEME_COLOR: ThemeColorSchema,
  BG_COLOR: BgColorSchema,
  ENCODE_MODE: EncodeMode.catch("enable"),
  TELEMETRY_ENABLED: z.boolean(),
  EXPAND_NAVIGATION: z.boolean(),
  SIDEBAR: z.boolean(),
  SIDEBAR_ON_LEFT: z.boolean(),
  COLUMN_LAYOUT: z.boolean(),

  WRAP_LINES: z.optional(
    z.object({
      httpRequestBody: z.boolean().catch(true),
      httpResponseBody: z.boolean().catch(true),
      httpHeaders: z.boolean().catch(true),
      httpParams: z.boolean().catch(true),
      httpUrlEncoded: z.boolean().catch(true),
      httpPreRequest: z.boolean().catch(true),
      httpTest: z.boolean().catch(true),
      httpRequestVariables: z.boolean().catch(true),
      graphqlQuery: z.boolean().catch(true),
      graphqlResponseBody: z.boolean().catch(true),
      graphqlHeaders: z.boolean().catch(false),
      graphqlVariables: z.boolean().catch(false),
      graphqlSchema: z.boolean().catch(true),
      importCurl: z.boolean().catch(true),
      codeGen: z.boolean().catch(true),
      cookie: z.boolean().catch(true),
    })
  ),

  HAS_OPENED_SPOTLIGHT: z.optional(z.boolean()),
  ENABLE_AI_EXPERIMENTS: z.optional(z.boolean()),
  EXTENSIONS_ENABLED: z.optional(z.booolean()),
  PROXY_ENABLED: z.optional(z.boolean()),
})

export default defineVersion({
  initial: true,
  schema: V0_SCHEMA,
})