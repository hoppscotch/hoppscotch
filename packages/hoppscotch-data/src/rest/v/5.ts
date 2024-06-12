import { z } from "zod"
import { defineVersion } from "verzod"
import {
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"
import { HoppRESTAuthAPIKey, V4_SCHEMA } from "./4"
import {
  AuthCodeGrantTypeParams as AuthCodeGrantTypeParamsOld,
  ClientCredentialsGrantTypeParams,
  HoppRESTAuthOAuth2 as HoppRESTAuthOAuth2Old,
  ImplicitOauthFlowParams,
  PasswordGrantTypeParams,
} from "./3"

export const AuthCodeGrantTypeParams = AuthCodeGrantTypeParamsOld.extend({
  clientSecret: z.string().optional(),
})

export const HoppRESTAuthOAuth2 = HoppRESTAuthOAuth2Old.extend({
  grantTypeInfo: z.discriminatedUnion("grantType", [
    AuthCodeGrantTypeParams,
    ClientCredentialsGrantTypeParams,
    PasswordGrantTypeParams,
    ImplicitOauthFlowParams,
  ]),
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

export const V5_SCHEMA = V4_SCHEMA.extend({
  v: z.literal("5"),
  auth: HoppRESTAuth,
})

export default defineVersion({
  schema: V5_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V4_SCHEMA>) {
    // v5 is not a breaking change in terms of migrations
    // we're just making clientSecret in authcode + pkce flow optional
    return {
      ...old,
      v: "5" as const,
    }
  },
})
