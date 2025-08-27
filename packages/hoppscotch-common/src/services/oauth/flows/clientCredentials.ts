import {
  OauthAuthService,
  createFlowConfig,
  decodeResponseAsJSON,
} from "../oauth.service"
import { z } from "zod"
import { getService } from "~/modules/dioc"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { useToast } from "~/composables/toast"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { RelayRequest, content } from "@hoppscotch/kernel"
import { parseBytesToJSON } from "~/helpers/functional/json"
import { refreshToken, OAuth2ParamSchema } from "../utils"

const interceptorService = getService(KernelInterceptorService)

const ClientCredentialsFlowParamsSchema = z
  .object({
    authEndpoint: z.string(),
    clientID: z.string(),
    clientSecret: z.string().optional(),
    scopes: z.string().optional(),
    clientAuthentication: z.enum(["AS_BASIC_AUTH_HEADERS", "IN_BODY"]),
    tokenRequestParams: z.array(OAuth2ParamSchema),
    refreshRequestParams: z.array(OAuth2ParamSchema),
  })
  .refine(
    (params) => {
      return (
        params.authEndpoint.length >= 1 &&
        params.clientID.length >= 1 &&
        (!params.scopes || params.scopes.length >= 1)
      )
    },
    {
      message: "Minimum length requirement not met for one or more parameters",
    }
  )

export type ClientCredentialsFlowParams = z.infer<
  typeof ClientCredentialsFlowParamsSchema
>

export const getDefaultClientCredentialsFlowParams =
  (): ClientCredentialsFlowParams => ({
    authEndpoint: "",
    clientID: "",
    clientSecret: "",
    scopes: undefined,
    clientAuthentication: "IN_BODY",
    tokenRequestParams: [],
    refreshRequestParams: [],
  })

const initClientCredentialsOAuthFlow = async (
  payload: ClientCredentialsFlowParams
) => {
  const toast = useToast()

  const requestPayload =
    payload.clientAuthentication === "AS_BASIC_AUTH_HEADERS"
      ? getPayloadForViaBasicAuthHeader(payload)
      : getPayloadForViaBody(payload)

  const { response } = interceptorService.execute(requestPayload)

  const res = await response

  if (E.isLeft(res)) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }

  const jsonResponse = decodeResponseAsJSON(res.right)

  if (E.isLeft(jsonResponse)) return E.left("AUTH_TOKEN_REQUEST_FAILED")

  const withAccessTokenSchema = z.object({
    access_token: z.string(),
  })

  const parsedTokenResponse = withAccessTokenSchema.safeParse(
    jsonResponse.right
  )

  if (!parsedTokenResponse.success) {
    toast.error("AUTH_TOKEN_REQUEST_INVALID_RESPONSE")
  }

  return parsedTokenResponse.success
    ? E.right(parsedTokenResponse.data)
    : E.left("AUTH_TOKEN_REQUEST_INVALID_RESPONSE" as const)
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

  const { response } = interceptorService.execute({
    id: Date.now(),
    url: decodedLocalConfig.data.tokenEndpoint,
    method: "POST",
    version: "HTTP/1.1",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    content: content.urlencoded({
      code,
      client_id: decodedLocalConfig.data.clientID,
      client_secret: decodedLocalConfig.data.clientSecret,
      redirect_uri: OauthAuthService.redirectURI,
    }),
  })

  const res = await response

  if (E.isLeft(res)) {
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

export default createFlowConfig(
  "CLIENT_CREDENTIALS" as const,
  ClientCredentialsFlowParamsSchema,
  initClientCredentialsOAuthFlow,
  handleRedirectForAuthCodeOauthFlow,
  refreshToken
)

const getPayloadForViaBasicAuthHeader = ({
  clientID,
  clientSecret,
  scopes,
  authEndpoint,
  tokenRequestParams,
}: ClientCredentialsFlowParams): RelayRequest => {
  // RFC 6749 Section 2.3.1 states that the client ID and secret should be URL encoded.
  const encodedClientID = encodeBasicAuthComponent(clientID)
  const encodedClientSecret = encodeBasicAuthComponent(clientSecret || "")
  const basicAuthToken = btoa(`${encodedClientID}:${encodedClientSecret}`)

  const headers: Record<string, string> = {
    Authorization: `Basic ${basicAuthToken}`,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  const bodyParams: Record<string, string> = {
    grant_type: "client_credentials",
    ...(scopes && { scope: scopes }),
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

  return {
    id: Date.now(),
    url: url.toString(),
    method: "POST",
    version: "HTTP/1.1",
    headers,
    content: content.urlencoded(bodyParams),
  }
}

const getPayloadForViaBody = ({
  clientID,
  clientSecret,
  scopes,
  authEndpoint,
  tokenRequestParams,
}: ClientCredentialsFlowParams): RelayRequest => {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  const bodyParams: Record<string, string> = {
    grant_type: "client_credentials",
    client_id: clientID,
    ...(clientSecret && { client_secret: clientSecret }),
    ...(scopes && { scope: scopes }),
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

  return {
    id: Date.now(),
    url: url.toString(),
    method: "POST",
    version: "HTTP/1.1",
    headers,
    content: content.urlencoded(bodyParams),
  }
}

const encodeBasicAuthComponent = (component: string): string => {
  // application/x-www-form-urlencoded expects spaces to be encoded as '+', but
  // encodeURIComponent encodes them as '%20'.
  return encodeURIComponent(component).replace(/%20/g, "+")
}
