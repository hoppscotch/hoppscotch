import {
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"
import { HoppRESTAuthAPIKey } from "./4"
import { AuthCodeGrantTypeParams, HoppRESTAuthAWSSignature } from "./7"
import {
  ClientCredentialsGrantTypeParams as ClientCredentialsGrantTypeParamsOld,
  HoppRESTAuthDigest,
  PasswordGrantTypeParams,
} from "./8"
import { ImplicitOauthFlowParams } from "./3"
import { z } from "zod"

import { V10_SCHEMA } from "./10"
import { defineVersion } from "verzod"

export const ClientCredentialsGrantTypeParams =
  ClientCredentialsGrantTypeParamsOld.extend({
    sendAs: z.enum(["AS_BASIC_AUTH_HEADERS", "IN_BODY"]),
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
    HoppRESTAuthDigest,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type HoppRESTAuth = z.infer<typeof HoppRESTAuth>

export const V11_SCHEMA = V10_SCHEMA.extend({
  v: z.literal("11"),
  auth: HoppRESTAuth,
})

export default defineVersion({
  schema: V11_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V10_SCHEMA>) {
    const auth = old.auth

    return {
      ...old,
      v: "11" as const,
      auth:
        auth.authType === "oauth-2"
          ? {
              ...auth,
              grantTypeInfo:
                auth.grantTypeInfo.grantType === "CLIENT_CREDENTIALS"
                  ? {
                      ...auth.grantTypeInfo,
                      sendAs: "IN_BODY" as const,
                    }
                  : auth.grantTypeInfo,
            }
          : auth,
    }
  },
})
