import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import {
  OauthAuthService,
  createFlowConfig,
  decodeResponseAsJSON,
} from "../oauth.service"
import { z } from "zod"
import { getService } from "~/modules/dioc"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { useToast } from "~/composables/toast"
import { content } from "@hoppscotch/kernel"
import { parseBytesToJSON } from "~/helpers/functional/json"
import { OAuth2ParamSchema, refreshToken } from "../utils"

const interceptorService = getService(KernelInterceptorService)

const PasswordFlowParamsSchema = z
  .object({
    authEndpoint: z.string(),
    clientID: z.string(),
    clientSecret: z.string().optional(),
    scopes: z.string().optional(),
    username: z.string(),
    password: z.string(),
    tokenRequestParams: z.array(OAuth2ParamSchema),
    refreshRequestParams: z.array(OAuth2ParamSchema),
  })
  .refine(
    (params) => {
      return (
        params.authEndpoint.length >= 1 &&
        params.clientID.length >= 1 &&
        params.username.length >= 1 &&
        params.password.length >= 1 &&
        (!params.scopes || params.scopes.length >= 1)
      )
    },
    {
      message: "Minimum length requirement not met for one or more parameters",
    }
  )

export type PasswordFlowParams = z.infer<typeof PasswordFlowParamsSchema>

export const getDefaultPasswordFlowParams = (): PasswordFlowParams => ({
  authEndpoint: "",
  clientID: "",
  clientSecret: "",
  scopes: undefined,
  username: "",
  password: "",
  tokenRequestParams: [],
  refreshRequestParams: [],
})

const initPasswordOauthFlow = async ({
  password,
  username,
  clientID,
  clientSecret,
  scopes,
  authEndpoint,
  tokenRequestParams,
}: PasswordFlowParams) => {
  const toast = useToast()

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  const bodyParams: Record<string, string> = {
    grant_type: "password",
    client_id: clientID,
    username,
    password,
    ...(clientSecret && {
      client_secret: clientSecret,
    }),
    ...(scopes && {
      scope: scopes,
    }),
  }

  const urlParams: Record<string, string> = {}

  // Process additional token request parameters
  if (tokenRequestParams) {
    tokenRequestParams
      .filter((param) => param.active && param.key && param.value)
      .forEach((param) => {
        if (param.sendIn === "headers") {
          headers[param.key] = param.value
        } else if (param.sendIn === "url") {
          urlParams[param.key] = param.value
        } else {
          // Default to body
          bodyParams[param.key] = param.value
        }
      })
  }

  const url = new URL(authEndpoint)
  Object.entries(urlParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  const { response } = interceptorService.execute({
    id: Date.now(),
    url: url.toString(),
    method: "POST",
    version: "HTTP/1.1",
    headers,
    content: content.urlencoded(bodyParams),
  })

  const res = await response

  if (E.isLeft(res) || res.right.status !== 200) {
    toast.error("AUTH_TOKEN_REQUEST_FAILED")
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }

  const withAccessTokenSchema = z.object({
    access_token: z.string(),
  })

  const responsePayload = parseBytesToJSON<{ access_token: string }>(
    res.right.body.body
  )

  if (O.isSome(responsePayload)) {
    const parsedTokenResponse = withAccessTokenSchema.safeParse(
      responsePayload.value
    )
    return parsedTokenResponse.success
      ? E.right(parsedTokenResponse.data)
      : E.left("AUTH_TOKEN_REQUEST_INVALID_RESPONSE" as const)
  }

  return E.left("AUTH_TOKEN_REQUEST_INVALID_RESPONSE" as const)
}

const handleRedirectForAuthCodeOauthFlow = async (localConfig: string) => {
  // parse the query string
  const params = new URLSearchParams(window.location.search)

  const code = params.get("code")
  const state = params.get("state")
  const error = params.get("error")

  if (error) {
    return E.left("AUTH_SERVER_RETURNED_ERROR")
  }

  if (!code) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED")
  }

  const expectedSchema = z.object({
    state: z.string(),
    tokenEndpoint: z.string(),
    clientSecret: z.string(),
    clientID: z.string(),
  })

  const decodedLocalConfig = expectedSchema.safeParse(JSON.parse(localConfig))

  if (!decodedLocalConfig.success) {
    return E.left("INVALID_LOCAL_CONFIG")
  }

  // check if the state matches
  if (decodedLocalConfig.data.state !== state) {
    return E.left("INVALID_STATE")
  }

  // exchange the code for a token
  const config = {
    code,
    client_id: decodedLocalConfig.data.clientID,
    client_secret: decodedLocalConfig.data.clientSecret,
    redirect_uri: OauthAuthService.redirectURI,
  }

  const { response } = interceptorService.execute({
    id: Date.now(),
    url: decodedLocalConfig.data.tokenEndpoint,
    method: "POST",
    version: "HTTP/1.1",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    content: content.urlencoded(config),
  })

  const res = await response

  if (E.isLeft(res)) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }

  const responsePayload = decodeResponseAsJSON(res.right)

  if (E.isLeft(responsePayload)) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }

  const withAccessTokenSchema = z.object({
    access_token: z.string(),
  })

  const parsedTokenResponse = withAccessTokenSchema.safeParse(
    responsePayload.right
  )

  return parsedTokenResponse.success
    ? E.right(parsedTokenResponse.data)
    : E.left("AUTH_TOKEN_REQUEST_INVALID_RESPONSE" as const)
}

export default createFlowConfig(
  "PASSWORD" as const,
  PasswordFlowParamsSchema,
  initPasswordOauthFlow,
  handleRedirectForAuthCodeOauthFlow,
  refreshToken
)
