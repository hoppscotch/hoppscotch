import { RelayRequest, content } from "@hoppscotch/kernel"
import type { z } from "zod"
import type { OAuth2ParamSchema } from "./utils"

export type OAuth2RequestParam = z.infer<typeof OAuth2ParamSchema>

type BuildAuthCodeTokenRequestParams = {
  tokenEndpoint: string
  code: string
  clientID: string
  clientSecret: string
  redirectURI: string
  codeVerifier?: string
  tokenRequestParams?: Array<OAuth2RequestParam>
}

const AUTH_CODE_TOKEN_RESERVED_PARAM_KEYS = new Set([
  "code",
  "grant_type",
  "client_id",
  "client_secret",
  "redirect_uri",
  "code_verifier",
])

const applyOAuth2RequestParams = ({
  params,
  headers,
  bodyParams,
  urlParams,
}: {
  params?: Array<OAuth2RequestParam>
  headers: Record<string, string>
  bodyParams: Record<string, string>
  urlParams: Record<string, string>
}) => {
  params
    ?.filter(
      (param) =>
        param.active &&
        param.key &&
        param.value &&
        !AUTH_CODE_TOKEN_RESERVED_PARAM_KEYS.has(param.key)
    )
    .forEach((param) => {
      if (param.sendIn === "headers") {
        headers[param.key] = param.value
      } else if (param.sendIn === "url") {
        urlParams[param.key] = param.value
      } else {
        bodyParams[param.key] = param.value
      }
    })
}

const buildTokenEndpointUrl = (
  tokenEndpoint: string,
  urlParams: Record<string, string>
) => {
  const urlParamEntries = Object.entries(urlParams)

  if (urlParamEntries.length === 0) {
    return tokenEndpoint
  }

  const hashIndex = tokenEndpoint.indexOf("#")
  const endpointWithoutHash =
    hashIndex === -1 ? tokenEndpoint : tokenEndpoint.slice(0, hashIndex)
  const hash = hashIndex === -1 ? "" : tokenEndpoint.slice(hashIndex)
  const queryIndex = endpointWithoutHash.indexOf("?")
  const endpointWithoutQuery =
    queryIndex === -1
      ? endpointWithoutHash
      : endpointWithoutHash.slice(0, queryIndex)
  const query = new URLSearchParams(
    queryIndex === -1 ? "" : endpointWithoutHash.slice(queryIndex + 1)
  )

  urlParamEntries.forEach(([key, value]) => {
    query.set(key, value)
  })

  const queryString = query.toString()

  return `${endpointWithoutQuery}${queryString ? `?${queryString}` : ""}${hash}`
}

export const buildAuthCodeTokenRequest = ({
  tokenEndpoint,
  code,
  clientID,
  clientSecret,
  redirectURI,
  codeVerifier,
  tokenRequestParams,
}: BuildAuthCodeTokenRequestParams): RelayRequest => {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  const bodyParams: Record<string, string> = {}
  const urlParams: Record<string, string> = {}

  applyOAuth2RequestParams({
    params: tokenRequestParams,
    headers,
    bodyParams,
    urlParams,
  })

  // Required OAuth fields should always win over user-defined advanced params.
  bodyParams.code = code
  bodyParams.grant_type = "authorization_code"
  bodyParams.client_id = clientID
  bodyParams.client_secret = clientSecret
  bodyParams.redirect_uri = redirectURI

  if (codeVerifier) {
    bodyParams.code_verifier = codeVerifier
  }

  return {
    id: Date.now(),
    url: buildTokenEndpointUrl(tokenEndpoint, urlParams),
    method: "POST",
    version: "HTTP/1.1",
    headers,
    content: content.urlencoded(bodyParams),
  }
}
