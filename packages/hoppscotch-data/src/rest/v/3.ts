import { z } from "zod"
import {
  HoppRESTAuthAPIKey,
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"
import { V2_SCHEMA } from "./2"

import { defineVersion } from "verzod"

export const AuthCodeGrantTypeParams = z.object({
  grantType: z.literal("AUTHORIZATION_CODE"),
  authEndpoint: z.string().trim(),
  tokenEndpoint: z.string().trim(),
  clientID: z.string().trim(),
  clientSecret: z.string().trim(),
  scopes: z.string().trim().optional(),
  token: z.string().catch(""),
  isPKCE: z.boolean(),
  codeVerifierMethod: z
    .union([z.literal("plain"), z.literal("S256")])
    .optional(),
})

export const ClientCredentialsGrantTypeParams = z.object({
  grantType: z.literal("CLIENT_CREDENTIALS"),
  authEndpoint: z.string().trim(),
  clientID: z.string().trim(),
  clientSecret: z.string().trim(),
  scopes: z.string().trim().optional(),
  token: z.string().catch(""),
})

export const PasswordGrantTypeParams = z.object({
  grantType: z.literal("PASSWORD"),
  authEndpoint: z.string().trim(),
  clientID: z.string().trim(),
  clientSecret: z.string().trim(),
  scopes: z.string().trim().optional(),
  username: z.string().trim(),
  password: z.string().trim(),
  token: z.string().catch(""),
})

export const ImplicitOauthFlowParams = z.object({
  grantType: z.literal("IMPLICIT"),
  authEndpoint: z.string().trim(),
  clientID: z.string().trim(),
  scopes: z.string().trim().optional(),
  token: z.string().catch(""),
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

// V2_SCHEMA has one change in HoppRESTAuthOAuth2, we'll add the grant_type field
export const V3_SCHEMA = V2_SCHEMA.extend({
  v: z.literal("3"),
  auth: HoppRESTAuth,
})

export default defineVersion({
  initial: false,
  schema: V3_SCHEMA,
  up(old: z.infer<typeof V2_SCHEMA>) {
    if (old.auth.authType === "oauth-2") {
      const { token, accessTokenURL, scope, clientID, authURL } = old.auth

      return {
        ...old,
        v: "3" as const,
        auth: {
          ...old.auth,
          authType: "oauth-2" as const,
          grantTypeInfo: {
            grantType: "AUTHORIZATION_CODE" as const,
            authEndpoint: authURL,
            tokenEndpoint: accessTokenURL,
            clientID: clientID,
            clientSecret: "",
            scopes: scope,
            isPKCE: false,
            token,
          },
          addTo: "HEADERS" as const,
        },
      }
    }

    return {
      ...old,
      v: "3" as const,
      auth: {
        ...old.auth,
      },
    }
  },
})
