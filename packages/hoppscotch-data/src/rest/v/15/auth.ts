import { z } from "zod"
import {
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "../1"
import { HoppRESTAuthAPIKey } from "../4"
import { AuthCodeGrantTypeParams as AuthCodeGrantTypeParamsOld } from "../7"
import { HoppRESTAuthAWSSignature } from "../7"
import {
  HoppRESTAuthDigest,
  PasswordGrantTypeParams as PasswordGrantTypeParamsOld,
} from "../8/auth"
import { HoppRESTAuthAkamaiEdgeGrid, HoppRESTAuthHAWK } from "../12/auth"
import { HoppRESTAuthJWT } from "../13/auth"
import { ClientCredentialsGrantTypeParams as ClientCredentialsGrantTypeParamsOld } from "../11/auth"
import { ImplicitOauthFlowParams as ImplicitOauthFlowParamsOld } from "../3"

export { HoppRESTAuthJWT } from "../13/auth"

// Define the OAuth2 advanced parameter structure
const OAuth2AdvancedParam = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  active: z.boolean(),
  sendIn: z.enum(["headers", "url", "body"]).catch("headers"),
})

// omit sendIn from OAuth2AuthRequestParam
const OAuth2AuthRequestParam = OAuth2AdvancedParam.omit({ sendIn: true })

export const AuthCodeGrantTypeParams = AuthCodeGrantTypeParamsOld.extend({
  authRequestParams: z.array(OAuth2AuthRequestParam).optional().default([]),
  tokenRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
  refreshRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
})

export const ClientCredentialsGrantTypeParams =
  ClientCredentialsGrantTypeParamsOld.extend({
    tokenRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
    refreshRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
  })

export const PasswordGrantTypeParams = PasswordGrantTypeParamsOld.extend({
  tokenRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
  refreshRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
})

export const ImplicitOauthFlowParams = ImplicitOauthFlowParamsOld.extend({
  authRequestParams: z.array(OAuth2AuthRequestParam).optional().default([]),
  refreshRequestParams: z.array(OAuth2AdvancedParam).optional().default([]),
})

// Extend OAuth2 with advanced parameters
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
