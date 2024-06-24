import { z } from "zod"
import { defineVersion } from "verzod"
import {
  HoppRESTAuthAPIKey,
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"
import { HoppRESTAuthOAuth2, V5_SCHEMA } from "./5"

// in this new version, we add a new auth type for AWS Signature
// this auth type is used for AWS Signature V5 authentication
// it requires the user to provide the access key id, secret access key, region, service name, and service token

export const HoppRESTAuthAWSSignature = z.object({
  authType: z.literal("aws-signature"),
  accessKey: z.string(),
  secretKey: z.string(),
  region: z.string(),
  serviceName: z.string(),
  serviceToken: z.string().optional(),
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
})

export type HoppRESTAuthAWSSignature = z.infer<typeof HoppRESTAuthAWSSignature>

export const HoppRESTAuth = z
  .discriminatedUnion("authType", [
    HoppRESTAuthNone,
    HoppRESTAuthInherit,
    HoppRESTAuthBasic,
    HoppRESTAuthBearer,
    HoppRESTAuthOAuth2,
    HoppRESTAuthAPIKey,
    HoppRESTAuthAWSSignature,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type HoppRESTAuth = z.infer<typeof HoppRESTAuth>

export const V6_SCHEMA = V5_SCHEMA.extend({
  v: z.literal("6"),
  auth: HoppRESTAuth,
})

export default defineVersion({
  schema: V6_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V5_SCHEMA>) {
    return {
      ...old,
      v: "6" as const,
    }
  },
})
