import { defineVersion } from "verzod"
import { z } from "zod"

import { V7_SCHEMA } from "../7"

import { HoppRESTRequestResponses } from "../../../rest-request-response"

import { HoppRESTAuth } from "./auth"

export const V8_SCHEMA = V7_SCHEMA.extend({
  v: z.literal("8"),
  auth: HoppRESTAuth,
  responses: HoppRESTRequestResponses,
})

export default defineVersion({
  schema: V8_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V7_SCHEMA>) {
    return {
      ...old,
      v: "8" as const,
      // no need to update anything for HoppRESTAuth, because we loosened the previous schema by making `clientSecret` optional
      responses: {},
    }
  },
})
