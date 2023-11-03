import { defineVersion } from "verzod"
import { z } from "zod"

import { V0_SCHEMA } from "./0"

export const FormDataKeyValue = z.object({
  key: z.string(),
  active: z.boolean()
}).and(
  z.union([
    z.object({
      isFile: z.literal(true),
      value: z.array(z.instanceof(Blob))
    }),
    z.object({
      isFile: z.literal(false),
      value: z.string()
    })
  ])
)

export type FormDataKeyValue = z.infer<typeof FormDataKeyValue>

export const HoppRESTReqBodyFormData = z.object({
  contentType: z.literal("multipart/form-data"),
  body: z.array(FormDataKeyValue)
})

export type HoppRESTReqBodyFormData = z.infer<typeof HoppRESTReqBodyFormData>

export const HoppRESTReqBody = z.union([
  z.object({
    contentType: z.literal(null),
    body: z.literal(null)
  }),
  z.object({
    contentType: z.literal("multipart/form-data"),
    body: FormDataKeyValue
  }),
  z.object({
    contentType: z.union([
      z.literal("application/json"),
      z.literal("application/ld+json"),
      z.literal("application/hal+json"),
      z.literal("application/vnd.api+json"),
      z.literal("application/xml"),
      z.literal("application/x-www-form-urlencoded"),
      z.literal("text/html"),
      z.literal("text/plain"),
    ]),
    body: z.string()
  })
])

export type HoppRESTReqBody = z.infer<typeof HoppRESTReqBody>

export const HoppRESTAuthNone = z.object({
  authType: z.literal("none")
})

export type HoppRESTAuthNone = z.infer<typeof HoppRESTAuthNone>

export const HoppRESTAuthBasic = z.object({
  authType: z.literal("basic"),
  username: z.string(),
  password: z.string(),
})

export type HoppRESTAuthBasic = z.infer<typeof HoppRESTAuthBasic>

export const HoppRESTAuthBearer = z.object({
  authType: z.literal("bearer"),
  token: z.string(),
})

export type HoppRESTAuthBearer = z.infer<typeof HoppRESTAuthBearer>

export const HoppRESTAuthOAuth2 = z.object({
  authType: z.literal("oauth-2"),
  token: z.string(),
  oidcDiscoveryURL: z.string(),
  authURL: z.string(),
  accessTokenURL: z.string(),
  clientID: z.string(),
  scope: z.string(),
})

export type HoppRESTAuthOAuth2 = z.infer<typeof HoppRESTAuthOAuth2>

export const HoppRESTAuthAPIKey = z.object({
  authType: z.literal("api-key"),
  key: z.string(),
  value: z.string(),
  addTo: z.string(),
})

export type HoppRESTAuthAPIKey = z.infer<typeof HoppRESTAuthAPIKey>

export const HoppRESTAuth = z.discriminatedUnion("authType", [
  HoppRESTAuthNone,
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthOAuth2,
  HoppRESTAuthAPIKey
]).and(
  z.object({
    authActive: z.boolean(),
  })
)

export type HoppRESTAuth = z.infer<typeof HoppRESTAuth>

export const HoppRESTParams = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
    active: z.boolean()
  })
)

export type HoppRESTParams = z.infer<typeof HoppRESTParams>

export const HoppRESTHeaders = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
    active: z.boolean()
  })
)

export type HoppRESTHeaders = z.infer<typeof HoppRESTHeaders>

const V1_SCHEMA = z.object({
  v: z.literal("1"),
  id: z.optional(z.string()), // Firebase Firestore ID

  name: z.string(),
  method: z.string(),
  endpoint: z.string(),
  params: HoppRESTParams,
  headers: HoppRESTHeaders,
  preRequestScript: z.string(),
  testScript: z.string(),

  auth: HoppRESTAuth,

  body: HoppRESTReqBody
})

function parseRequestBody(x: z.infer<typeof V0_SCHEMA>): z.infer<typeof V1_SCHEMA>["body"] {
  return {
    contentType: "application/json",
    body: x.contentType === "application/json" ? x.rawParams ?? "" : "",
  }
}

export function parseOldAuth(x: z.infer<typeof V0_SCHEMA>): z.infer<typeof V1_SCHEMA>["auth"] {
  if (!x.auth || x.auth === "None")
    return {
      authType: "none",
      authActive: true,
    }

  if (x.auth === "Basic Auth")
    return {
      authType: "basic",
      authActive: true,
      username: x.httpUser ?? "",
      password: x.httpPassword ?? "",
    }

  if (x.auth === "Bearer Token")
    return {
      authType: "bearer",
      authActive: true,
      token: x.bearerToken ?? "",
    }

  return { authType: "none", authActive: true }
}

export default defineVersion({
  initial: false,
  schema: V1_SCHEMA,
  up(old: z.infer<typeof V0_SCHEMA>) {
    const { url, path, headers, params, name, method, preRequestScript, testScript } = old

    const endpoint = `${url}${path}`
    const body = parseRequestBody(old)
    const auth = parseOldAuth(old)

    const result: z.infer<typeof V1_SCHEMA> = {
      v: "1",
      endpoint,
      headers,
      params,
      name,
      method,
      preRequestScript,
      testScript,
      body,
      auth,
    }

    if (old.id) result.id = old.id

    return result
  },
})
