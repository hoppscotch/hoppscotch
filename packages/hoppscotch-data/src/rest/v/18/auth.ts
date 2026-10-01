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
import { HoppRESTAuthAkamaiEdgeGrid, HoppRESTAuthHAWK } from "../12/auth"
import { HoppRESTAuthJWT } from "../13/auth"
import {
  AuthCodeGrantTypeParams as AuthCodeGrantTypeParamsOld,
  ClientCredentialsGrantTypeParams as ClientCredentialsGrantTypeParamsOld,
  ImplicitOauthFlowParams,
  OAuth2AdvancedParam,
  OAuth2AuthRequestParam,
  PasswordGrantTypeParams,
} from "../15/auth"

export { HoppRESTAuthJWT } from "../13/auth"

export const AuthCodeGrantTypeParams = AuthCodeGrantTypeParamsOld.extend({
  clientAuthentication: z
    .enum(["AS_BASIC_AUTH_HEADERS", "IN_BODY"])
    .catch("IN_BODY"),
})

export const ClientCredentialsGrantTypeParams =
  ClientCredentialsGrantTypeParamsOld.extend({
    clientAuthentication: z
      .enum(["AS_BASIC_AUTH_HEADERS", "IN_BODY"])
      .catch("IN_BODY"),
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

export {
  ImplicitOauthFlowParams,
  OAuth2AdvancedParam,
  OAuth2AuthRequestParam,
  PasswordGrantTypeParams,
}
