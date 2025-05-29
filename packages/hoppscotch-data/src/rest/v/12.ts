import {
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"
import { HoppRESTAuthAPIKey } from "./4"
import { HoppRESTAuthAWSSignature } from "./7"
import { HoppRESTAuthDigest } from "./8"

import { z } from "zod"
import { defineVersion } from "verzod"
import { HoppRESTAuthOAuth2, V11_SCHEMA } from "./11"

import {
  HoppRESTResponseOriginalRequest as HoppRESTResponseOriginalRequestOld,
  HoppRESTRequestResponse as HoppRESTRequestResponseOld,
} from "./9"

export const HoppRESTAuthHAWK = z.object({
  authType: z.literal("hawk"),
  authId: z.string().catch(""),
  authKey: z.string().catch(""),
  algorithm: z.enum(["sha256", "sha1"]).catch("sha256"),
  includePayloadHash: z.boolean().catch(false),

  // Optional fields
  user: z.string().optional(),
  nonce: z.string().optional(),
  ext: z.string().optional(),
  app: z.string().optional(),
  dlg: z.string().optional(),
  timestamp: z.string().optional(),
})

export const HoppRESTAuthAkamaiEdgeGrid = z.object({
  authType: z.literal("akamai-eg"),
  accessToken: z.string().catch(""),
  clientToken: z.string().catch(""),
  clientSecret: z.string().catch(""),

  // Optional fields
  nonce: z.string().optional(),
  timestamp: z.string().optional(),
  host: z.string().optional(),
  headersToSign: z.string().optional(),
  maxBodySize: z.string().optional(),
})

export type HoppRESTAuthHAWK = z.infer<typeof HoppRESTAuthHAWK>
export type HoppRESTAuthAkamaiEdgeGrid = z.infer<
  typeof HoppRESTAuthAkamaiEdgeGrid
>

export const HoppRESTAuth = z
  .discriminatedUnion("authType", [
    HoppRESTAuthNone,
    HoppRESTAuthInherit,
    HoppRESTAuthBasic,
    HoppRESTAuthBearer,
    HoppRESTAuthOAuth2,
    HoppRESTAuthAPIKey,
    HoppRESTAuthAWSSignature,
    HoppRESTAuthDigest,
    HoppRESTAuthHAWK,
    HoppRESTAuthAkamaiEdgeGrid,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type HoppRESTAuth = z.infer<typeof HoppRESTAuth>

export const HoppRESTResponseOriginalRequest =
  HoppRESTResponseOriginalRequestOld.extend({
    v: z.literal("4"),
    auth: HoppRESTAuth,
  })

export type HoppRESTResponseOriginalRequest = z.infer<
  typeof HoppRESTResponseOriginalRequest
>

export const HoppRESTRequestResponse = HoppRESTRequestResponseOld.extend({
  originalRequest: HoppRESTResponseOriginalRequest,
})

export type HoppRESTRequestResponse = z.infer<typeof HoppRESTRequestResponse>

export const HoppRESTRequestResponses = z.record(
  z.string(),
  HoppRESTRequestResponse
)

export type HoppRESTRequestResponses = z.infer<typeof HoppRESTRequestResponses>

export const V12_SCHEMA = V11_SCHEMA.extend({
  v: z.literal("12"),
  auth: HoppRESTAuth,
  responses: HoppRESTRequestResponses,
})

export default defineVersion({
  schema: V12_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V11_SCHEMA>) {
    // update the version number of response original request
    const responses = Object.fromEntries(
      Object.entries(old.responses).map(([key, response]) => [
        key,
        {
          ...response,
          originalRequest: {
            ...response.originalRequest,
            v: "4" as const,
          },
        },
      ])
    )
    return {
      ...old,
      v: "12" as const,
      responses,
    }
  },
})
