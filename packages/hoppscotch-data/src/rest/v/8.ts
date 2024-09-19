import { z } from "zod"
import {
  ClientCredentialsGrantTypeParams as ClientCredentialsGrantTypeParamsOld,
  PasswordGrantTypeParams as PasswordGrantTypeParamsOld,
  ImplicitOauthFlowParams,
} from "./3"
import {
  AuthCodeGrantTypeParams as AuthCodeGrantTypeParamsOld,
  HoppRESTAuthAWSSignature,
  V7_SCHEMA,
} from "./7"
import {
  HoppRESTAuthAPIKey,
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"
import { defineVersion } from "verzod"

export const AuthCodeGrantTypeParams = AuthCodeGrantTypeParamsOld.extend({
  clientSecret: z.string().optional(),
})

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

const V8_SCHEMA = V7_SCHEMA.extend({
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
      // no need to update anything for HoppRESTAuth, because we loosened the previous schema by making clientSecret optional
    }
  },
})
