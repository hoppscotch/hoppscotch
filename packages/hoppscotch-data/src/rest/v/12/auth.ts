import { z } from "zod"
import {
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "../1"
import { HoppRESTAuthAPIKey } from "../4"
import { HoppRESTAuthAWSSignature } from "../7"
import { HoppRESTAuthDigest } from "../8/auth"
import { HoppRESTAuthOAuth2 } from "../11/auth"

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
