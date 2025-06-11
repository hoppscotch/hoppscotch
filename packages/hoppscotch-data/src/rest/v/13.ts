import {
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"
import { HoppRESTAuthAPIKey } from "./4"
import { HoppRESTAuthAWSSignature } from "./7"
import { HoppRESTAuthDigest } from "./8"

import { HoppRESTAuthHAWK, HoppRESTAuthAkamaiEdgeGrid, V12_SCHEMA } from "./12"

import { z } from "zod"
import { defineVersion } from "verzod"
import { HoppRESTAuthOAuth2 } from "./11"

import {
  HoppRESTResponseOriginalRequest as HoppRESTResponseOriginalRequestOld,
  HoppRESTRequestResponse as HoppRESTRequestResponseOld,
} from "./9"

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

export const HoppRESTResponseOriginalRequest =
  HoppRESTResponseOriginalRequestOld.extend({
    v: z.literal("5"),
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

export const V13_SCHEMA = V12_SCHEMA.extend({
  v: z.literal("13"),
  auth: HoppRESTAuth,
  responses: HoppRESTRequestResponses,
})

export default defineVersion({
  schema: V13_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V12_SCHEMA>) {
    // update the version number of response original request
    const responses = Object.fromEntries(
      Object.entries(old.responses).map(([key, response]) => [
        key,
        {
          ...response,
          originalRequest: {
            ...response.originalRequest,
            v: "5" as const,
          },
        },
      ])
    )
    return {
      ...old,
      v: "13" as const,
      responses,
    }
  },
})
