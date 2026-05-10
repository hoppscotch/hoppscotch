import { RelayRequest, content } from "@hoppscotch/kernel"

export type OAuth2RequestParam = {
  key: string
  value: string
  active: boolean
  sendIn?: "headers" | "url" | "body"
}

type BuildAuthCodeTokenRequestParams = {
  tokenEndpoint: string
  code: string
  clientID: string
  clientSecret: string
  redirectURI: string
  codeVerifier?: string
  tokenRequestParams?: Array<OAuth2RequestParam>
}

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
    ?.filter((param) => param.active && param.key && param.value)
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

  const bodyParams: Record<string, string> = {
    code,
    grant_type: "authorization_code",
    client_id: clientID,
    client_secret: clientSecret,
    redirect_uri: redirectURI,
  }

  if (codeVerifier) {
    bodyParams.code_verifier = codeVerifier
  }

  const urlParams: Record<string, string> = {}

  applyOAuth2RequestParams({
    params: tokenRequestParams,
    headers,
    bodyParams,
    urlParams,
  })

  const url = new URL(tokenEndpoint)
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
