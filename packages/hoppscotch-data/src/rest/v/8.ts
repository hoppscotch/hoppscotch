import { defineVersion } from "verzod"
import { z } from "zod"

import {
  HoppRESTAuthAPIKey,
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"

import {
  ClientCredentialsGrantTypeParams as ClientCredentialsGrantTypeParamsOld,
  ImplicitOauthFlowParams,
  PasswordGrantTypeParams as PasswordGrantTypeParamsOld,
} from "./3"

import {
  AuthCodeGrantTypeParams,
  HoppRESTAuthAWSSignature,
  V7_SCHEMA,
} from "./7"

export const ClientCredentialsGrantTypeParams =
  ClientCredentialsGrantTypeParamsOld.extend({
    clientSecret: z.string().optional(),
  })

export const PasswordGrantTypeParams = PasswordGrantTypeParamsOld.extend({
  clientSecret: z.string().optional(),
})

export const HoppRESTAuthOAuth2 = z.object({
  authType: z.literal("oauth-2"),
  grantTypeInfo: z.discriminatedUnion("grantType", [
    AuthCodeGrantTypeParams,
    ClientCredentialsGrantTypeParams,
    PasswordGrantTypeParams,
    ImplicitOauthFlowParams,
  ]),
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
})

export type HoppRESTAuthOAuth2 = z.infer<typeof HoppRESTAuthOAuth2>

// in this new version, we add a new auth type for Digest authentication
export const HoppRESTAuthDigest = z.object({
  authType: z.literal("digest"),
  username: z.string().catch(""),
  password: z.string().catch(""),
  realm: z.string().catch(""),
  nonce: z.string().catch(""),
  algorithm: z.enum(["MD5", "MD5-sess"]).catch("MD5"),
  qop: z.enum(["auth", "auth-int"]).catch("auth"),
  nc: z.string().catch(""),
  cnonce: z.string().catch(""),
  opaque: z.string().catch(""),
  disableRetry: z.boolean().catch(false),
})

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

export const V8_SCHEMA = V7_SCHEMA.extend({
  v: z.literal("8"),
  auth: HoppRESTAuth,
})

export default defineVersion({
  schema: V8_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V7_SCHEMA>) {
    return {
      ...old,
      v: "8" as const,
      // no need to update anything for HoppRESTAuth, because the digest auth is newly added
    }
  },
})
