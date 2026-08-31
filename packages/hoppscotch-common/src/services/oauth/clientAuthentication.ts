import { RelayRequest, content } from "@hoppscotch/kernel"

export type ClientAuthentication = "AS_BASIC_AUTH_HEADERS" | "IN_BODY"

export type OAuth2RequestParam = {
  id: number
  key: string
  value: string
  active: boolean
  sendIn?: "headers" | "url" | "body"
}

const reservedOAuthParamKeys = new Set([
  "authorization",
  "client_id",
  "client_secret",
  "code",
  "code_verifier",
  "grant_type",
  "redirect_uri",
  "refresh_token",
])

const scopeOAuthParamKeys = new Set(["scope"])

export const getBasicAuthHeader = (
  clientID: string,
  clientSecret = ""
): string => {
  const encodedClientID = encodeBasicAuthComponent(clientID)
  const encodedClientSecret = encodeBasicAuthComponent(clientSecret)

  return `Basic ${btoa(`${encodedClientID}:${encodedClientSecret}`)}`
}

const encodeBasicAuthComponent = (component: string): string => {
  // RFC 6749 Section 2.3.1 states that the client ID and secret should be URL encoded.
  // application/x-www-form-urlencoded expects spaces to be encoded as '+', but
  // encodeURIComponent encodes them as '%20'.
  return encodeURIComponent(component).replace(/%20/g, "+")
}

export const applyRequestParams = (
  requestParams: Array<OAuth2RequestParam> | undefined,
  headers: Record<string, string>,
  bodyParams: Record<string, string>,
  urlParams: Record<string, string>,
  additionalReservedParamKeys?: ReadonlySet<string>
) => {
  requestParams
    ?.filter((param) => param.active && param.key)
    .forEach((param) => {
      const normalizedKey = param.key.toLowerCase()
      const hasAuthorizationHeader = Object.keys(headers).some(
        (key) => key.toLowerCase() === "authorization"
      )

      if (
        (reservedOAuthParamKeys.has(normalizedKey) ||
          additionalReservedParamKeys?.has(normalizedKey)) &&
        !(normalizedKey === "authorization" && !hasAuthorizationHeader)
      ) {
        return
      }

      if (param.sendIn === "headers") {
        headers[param.key] = param.value
      } else if (param.sendIn === "url") {
        urlParams[param.key] = param.value
      } else {
        bodyParams[param.key] = param.value
      }
    })
}

const getURLWithParams = (
  tokenEndpoint: string,
  urlParams: Record<string, string>
) => {
  const url = new URL(tokenEndpoint)
  Object.entries(urlParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url.toString()
}

type AuthCodeTokenRequestParams = {
  tokenEndpoint: string
  redirectURI: string
  clientID: string
  clientSecret?: string
  clientAuthentication?: ClientAuthentication
  code: string
  codeVerifier?: string
  tokenRequestParams?: Array<OAuth2RequestParam>
}

export const getPayloadForAuthCodeTokenRequest = ({
  tokenEndpoint,
  redirectURI,
  clientID,
  clientSecret,
  clientAuthentication = "IN_BODY",
  code,
  codeVerifier,
  tokenRequestParams,
}: AuthCodeTokenRequestParams): RelayRequest => {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  if (clientAuthentication === "AS_BASIC_AUTH_HEADERS") {
    headers.Authorization = getBasicAuthHeader(clientID, clientSecret)
  }

  const bodyParams: Record<string, string> = {
    code,
    grant_type: "authorization_code",
    ...(clientAuthentication === "IN_BODY" && {
      client_id: clientID,
      ...(clientSecret && {
        client_secret: clientSecret,
      }),
    }),
    redirect_uri: redirectURI,
    ...(codeVerifier && {
      code_verifier: codeVerifier,
    }),
  }

  const urlParams: Record<string, string> = {}

  applyRequestParams(tokenRequestParams, headers, bodyParams, urlParams)

  return {
    id: Date.now(),
    url: getURLWithParams(tokenEndpoint, urlParams),
    method: "POST",
    version: "HTTP/1.1",
    headers,
    content: content.urlencoded(bodyParams),
  }
}

type ClientCredentialsTokenRequestParams = {
  tokenEndpoint: string
  clientID: string
  clientSecret?: string
  scopes?: string
  clientAuthentication?: ClientAuthentication
  tokenRequestParams?: Array<OAuth2RequestParam>
}

export const getPayloadForClientCredentialsTokenRequest = ({
  tokenEndpoint,
  clientID,
  clientSecret,
  scopes,
  clientAuthentication = "IN_BODY",
  tokenRequestParams,
}: ClientCredentialsTokenRequestParams): RelayRequest => {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  if (clientAuthentication === "AS_BASIC_AUTH_HEADERS") {
    headers.Authorization = getBasicAuthHeader(clientID, clientSecret)
  }

  const bodyParams: Record<string, string> = {
    grant_type: "client_credentials",
    ...(clientAuthentication === "IN_BODY" && {
      client_id: clientID,
      ...(clientSecret && {
        client_secret: clientSecret,
      }),
    }),
    ...(scopes && { scope: scopes }),
  }

  const urlParams: Record<string, string> = {}

  applyRequestParams(
    tokenRequestParams,
    headers,
    bodyParams,
    urlParams,
    scopes ? scopeOAuthParamKeys : undefined
  )

  return {
    id: Date.now(),
    url: getURLWithParams(tokenEndpoint, urlParams),
    method: "POST",
    version: "HTTP/1.1",
    headers,
    content: content.urlencoded(bodyParams),
  }
}

type RefreshTokenRequestParams = {
  tokenEndpoint: string
  clientID: string
  clientSecret?: string
  refreshToken: string
  clientAuthentication?: ClientAuthentication
  refreshRequestParams?: Array<OAuth2RequestParam>
}

export const getPayloadForRefreshTokenRequest = ({
  tokenEndpoint,
  clientID,
  clientSecret,
  refreshToken,
  clientAuthentication = "IN_BODY",
  refreshRequestParams,
}: RefreshTokenRequestParams): RelayRequest => {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  if (clientAuthentication === "AS_BASIC_AUTH_HEADERS") {
    headers.Authorization = getBasicAuthHeader(clientID, clientSecret)
  }

  const bodyParams: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    ...(clientAuthentication === "IN_BODY" && {
      client_id: clientID,
      ...(clientSecret && {
        client_secret: clientSecret,
      }),
    }),
  }

  const urlParams: Record<string, string> = {}

  applyRequestParams(refreshRequestParams, headers, bodyParams, urlParams)

  return {
    id: Date.now(),
    url: getURLWithParams(tokenEndpoint, urlParams),
    method: "POST",
    version: "HTTP/1.1",
    headers,
    content: content.urlencoded(bodyParams),
  }
}
