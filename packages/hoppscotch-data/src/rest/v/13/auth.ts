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
import { HoppRESTAuthAkamaiEdgeGrid, HoppRESTAuthHAWK } from "../12/auth"

export const HoppRESTAuthJWT = z.object({
  authType: z.literal("jwt"),
  secret: z.string().catch(""),
  privateKey: z.string().catch(""), // For RSA/ECDSA algorithms
  algorithm: z
    .enum([
      "HS256",
      "HS384",
      "HS512",
      "RS256",
      "RS384",
      "RS512",
      "PS256",
      "PS384",
      "PS512",
      "ES256",
      "ES384",
      "ES512",
    ])
    .catch("HS256"),
  payload: z.string().catch("{}"),
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
  isSecretBase64Encoded: z.boolean().catch(false),
  headerPrefix: z.string().catch("Bearer "),
  paramName: z.string().catch("token"),
  jwtHeaders: z.string().catch("{}"),
})

export type HoppRESTAuthJWT = z.infer<typeof HoppRESTAuthJWT>

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
    HoppRESTAuthJWT,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type HoppRESTAuth = z.infer<typeof HoppRESTAuth>
