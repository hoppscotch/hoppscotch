import { defineVersion } from "verzod"
import { z } from "zod"

import { V6_SCHEMA } from "./6"

import { AuthCodeGrantTypeParams as AuthCodeGrantTypeParamsOld } from "./5"

import {
  ClientCredentialsGrantTypeParams,
  ImplicitOauthFlowParams,
  PasswordGrantTypeParams,
} from "./3"
import {
  HoppRESTAuthAPIKey,
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"

// Add refreshToken to all grant types except Implicit
export const AuthCodeGrantTypeParams = AuthCodeGrantTypeParamsOld.extend({
  refreshToken: z.string().optional(),
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

export const HoppRESTParams = z.array(
  z.object({
    key: z.string().catch(""),
    value: z.string().catch(""),
    active: z.boolean().catch(true),
    description: z.string().catch(""),
  })
)

export type HoppRESTParams = z.infer<typeof HoppRESTParams>

export const HoppRESTHeaders = z.array(
  z.object({
    key: z.string().catch(""),
    value: z.string().catch(""),
    active: z.boolean().catch(true),
    description: z.string().catch(""),
  })
)

export type HoppRESTHeaders = z.infer<typeof HoppRESTHeaders>

export const V7_SCHEMA = V6_SCHEMA.extend({
  v: z.literal("7"),
  params: HoppRESTParams,
  headers: HoppRESTHeaders,
  auth: HoppRESTAuth,
})

export default defineVersion({
  schema: V7_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V6_SCHEMA>) {
    const params = old.params.map((param) => {
      return {
        ...param,
        description: "",
      }
    })

    const headers = old.headers.map((header) => {
      return {
        ...header,
        description: "",
      }
    })

    return {
      ...old,
      v: "7" as const,
      params,
      headers,
      // no need to update anything for HoppRESTAuth, because the newly added refreshToken is optional
    }
  },
})
