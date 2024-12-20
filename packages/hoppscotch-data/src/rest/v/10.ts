import { z } from "zod"
import { FormDataKeyValue, V9_SCHEMA } from "./9"
import { defineVersion } from "verzod"
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

export const HoppRESTReqBody = z.union([
  z.object({
    contentType: z.literal(null),
    body: z.literal(null).catch(null),
  }),
  z.object({
    contentType: z.literal("multipart/form-data"),
    body: z.array(FormDataKeyValue).catch([]),
    showIndividualContentType: z.boolean().optional().catch(false),
    isBulkEditing: z.boolean().optional().catch(false),
  }),
  z.object({
    contentType: z.literal("application/octet-stream"),
    body: z.instanceof(File).nullable().catch(null),
  }),
  z.object({
    contentType: z.literal("application/x-www-form-urlencoded"),
    body: z.string().catch(""),
    isBulkEditing: z.boolean().optional().catch(false),
  }),
  z.object({
    contentType: z.union([
      z.literal("application/json"),
      z.literal("application/ld+json"),
      z.literal("application/hal+json"),
      z.literal("application/vnd.api+json"),
      z.literal("application/xml"),
      z.literal("text/xml"),
      z.literal("binary"),
      z.literal("text/html"),
      z.literal("text/plain"),
    ]),
    body: z.string().catch(""),
  }),
])

export type HoppRESTReqBody = z.infer<typeof HoppRESTReqBody>

export const ClientCredentialsGrantTypeParams =
  ClientCredentialsGrantTypeParamsOld.extend({
    sendAs: z.enum(["AS_BASIC_AUTH_HEADERS", "IN_BODY"]).catch("IN_BODY"),
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

export const V10_SCHEMA = V9_SCHEMA.extend({
  v: z.literal("10"),
  body: HoppRESTReqBody,
})

export default defineVersion({
  schema: V10_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V9_SCHEMA>) {
    const auth = old.auth

    if (
      auth.authType === "oauth-2" &&
      auth.grantTypeInfo.grantType === "CLIENT_CREDENTIALS"
    ) {
      return {
        ...old,
        v: "10" as const,
        auth: {
          ...auth,
          grantTypeInfo: {
            ...auth.grantTypeInfo,
            sendAs: "IN_BODY",
          },
        },
      }
    }

    return {
      ...old,
      v: "10" as const,
    }
  },
})
