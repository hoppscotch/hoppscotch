import { z } from "zod"

import { defineVersion } from "verzod"

import { HoppRESTAuthOAuth2 } from "../../rest/v/5"
import {
  HoppGQLAuthBasic,
  HoppGQLAuthBearer,
  HoppGQLAuthInherit,
  HoppGQLAuthNone,
} from "./2"
import { HoppGQLAuthAPIKey, V4_SCHEMA } from "./4"

export { HoppRESTAuthOAuth2 as HoppGQLAuthOAuth2 } from "../../rest/v/5"

export const HoppGQLAuth = z
  .discriminatedUnion("authType", [
    HoppGQLAuthNone,
    HoppGQLAuthInherit,
    HoppGQLAuthBasic,
    HoppGQLAuthBearer,
    HoppGQLAuthAPIKey,
    HoppRESTAuthOAuth2, // both rest and gql have the same auth type for oauth2
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type HoppGQLAuth = z.infer<typeof HoppGQLAuth>

export const V5_SCHEMA = V4_SCHEMA.extend({
  v: z.literal(5),
  auth: HoppGQLAuth,
})

export default defineVersion({
  initial: false,
  schema: V5_SCHEMA,
  up(old: z.infer<typeof V4_SCHEMA>) {
    return {
      ...old,
      v: 5 as const,
    }
  },
})
