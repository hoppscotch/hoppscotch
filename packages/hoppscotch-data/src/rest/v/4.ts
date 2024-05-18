import { z } from "zod"
import { defineVersion } from "verzod"
import { HoppRESTAuthOAuth2, V3_SCHEMA } from "./3"
import {
  HoppRESTAuthAPIKey as HoppRESTAuthAPIKeyOld,
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"

// in this new version, we update the old 'Headers' and 'Query params' to be more consistent with OAuth addTo values
// also in the previous version addTo was a string, which prevented some bugs from being caught by the type system
// this version uses an enum, so we get the values as literals in the type system
export const HoppRESTAuthAPIKey = HoppRESTAuthAPIKeyOld.extend({
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
})

export type HoppRESTAuthAPIKey = z.infer<typeof HoppRESTAuthAPIKey>

export const HoppRESTAuth = z
  .discriminatedUnion("authType", [
    HoppRESTAuthNone,
    HoppRESTAuthInherit,
    HoppRESTAuthBasic,
    HoppRESTAuthBearer,
    HoppRESTAuthOAuth2,
    HoppRESTAuthAPIKey,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type HoppRESTAuth = z.infer<typeof HoppRESTAuth>

// export type HoppRESTExampleResponse = {
//   type: string
//   headers: { key: string; value: string }[]
//   body: string
//   statusCode: number
//   meta: {
//     responseSize: number // in bytes
//     responseDuration: number // in millis
//   }
// }
//
export const HoppRESTExampleResponse = z.object({
  name: z.string(),
  type: z.string(),
  headers: z.array(z.object({
    key: z.string(),
    value: z.string()
  })),
  body: z.string().catch(""),
  statusCode: z.number().catch(200),
  meta: z.object({
    responseSize: z.number(),
    responseDuration: z.number()
  })
})


export type HoppRESTExampleResponse = z.infer<typeof HoppRESTExampleResponse>

export const V4_SCHEMA = V3_SCHEMA.extend({
  v: z.literal("4"),
  auth: HoppRESTAuth,
  responses: z.array(HoppRESTExampleResponse)
})

export default defineVersion({
  schema: V4_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V3_SCHEMA>) {
    if (old.auth.authType === "api-key") {
      return {
        ...old,
        v: "4" as const,
        auth: {
          ...old.auth,
          addTo:
            old.auth.addTo === "Query params"
              ? ("QUERY_PARAMS" as const)
              : ("HEADERS" as const),
        },
        responses: []
      }
    }

    return {
      ...old,
      auth: {
        ...old.auth,
      },
      v: "4" as const,
      responses: []
    }
  },
})
