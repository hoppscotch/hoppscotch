import {
  parseTemplateString,
  HoppRESTRequest,
  Environment,
  HoppRESTHeader,
  HoppRESTParam,
} from "@hoppscotch/data"

// Interface for OAuth2 Advanced Parameters
export interface OAuth2AdvancedParam {
  id: number
  key: string
  value: string
  active: boolean
  description?: string
  sendIn?: string
}

// Extended OAuth2 Auth interface (for future implementation)
interface ExtendedOAuth2Auth {
  authType: "oauth-2"
  grantTypeInfo: any // OAuth2 grant type info
  addTo: "HEADERS" | "QUERY_PARAMS"
  authRequestParams?: OAuth2AdvancedParam[]
  tokenRequestParams?: OAuth2AdvancedParam[]
  refreshRequestParams?: OAuth2AdvancedParam[]
}

/**
 * Generate auth request parameters for OAuth2 authorization URL
 */
export function generateOAuth2AuthRequestParams(
  authRequestParams: OAuth2AdvancedParam[],
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Record<string, string> {
  const params: Record<string, string> = {}

  authRequestParams
    .filter((param) => param.active && param.key && param.value)
    .forEach((param) => {
      const key = parseTemplateString(
        param.key,
        envVars,
        false,
        showKeyIfSecret
      )
      const value = parseTemplateString(
        param.value,
        envVars,
        false,
        showKeyIfSecret
      )
      params[key] = value
    })

  return params
}

/**
 * Generate additional headers and body parameters for OAuth2 token request
 */
export function generateOAuth2TokenRequestData(
  tokenRequestParams: OAuth2AdvancedParam[],
  envVars: Environment["variables"],
  showKeyIfSecret = false
): {
  headers: Record<string, string>
  bodyParams: Record<string, string>
  queryParams: Record<string, string>
} {
  const headers: Record<string, string> = {}
  const bodyParams: Record<string, string> = {}
  const queryParams: Record<string, string> = {}

  tokenRequestParams
    .filter((param) => param.active && param.key && param.value)
    .forEach((param) => {
      const key = parseTemplateString(
        param.key,
        envVars,
        false,
        showKeyIfSecret
      )
      const value = parseTemplateString(
        param.value,
        envVars,
        false,
        showKeyIfSecret
      )

      switch (param.sendIn) {
        case "Request Headers":
          headers[key] = value
          break
        case "Request URL":
          queryParams[key] = value
          break
        case "Request Body":
        default:
          bodyParams[key] = value
          break
      }
    })

  return { headers, bodyParams, queryParams }
}

/**
 * Generate additional parameters for OAuth2 refresh token request
 */
export function generateOAuth2RefreshRequestData(
  refreshRequestParams: OAuth2AdvancedParam[],
  envVars: Environment["variables"],
  showKeyIfSecret = false
): {
  headers: Record<string, string>
  bodyParams: Record<string, string>
  queryParams: Record<string, string>
} {
  const headers: Record<string, string> = {}
  const bodyParams: Record<string, string> = {}
  const queryParams: Record<string, string> = {}

  refreshRequestParams
    .filter((param) => param.active && param.key && param.value)
    .forEach((param) => {
      const key = parseTemplateString(
        param.key,
        envVars,
        false,
        showKeyIfSecret
      )
      const value = parseTemplateString(
        param.value,
        envVars,
        false,
        showKeyIfSecret
      )

      switch (param.sendIn) {
        case "Request Headers":
          headers[key] = value
          break
        case "Request URL":
          queryParams[key] = value
          break
        case "Request Body":
        default:
          bodyParams[key] = value
          break
      }
    })

  return { headers, bodyParams, queryParams }
}

/**
 * Enhanced OAuth2 headers generation with advanced parameters
 */
export async function generateEnhancedOAuth2AuthHeaders(
  auth: ExtendedOAuth2Auth,
  request: HoppRESTRequest,
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  const headers: HoppRESTHeader[] = []

  // Add the standard Authorization header if addTo is HEADERS
  if (auth.addTo === "HEADERS") {
    const token = parseTemplateString(
      auth.grantTypeInfo.token,
      envVars,
      false,
      showKeyIfSecret
    )

    headers.push({
      active: true,
      key: "Authorization",
      value: `Bearer ${token}`,
      description: "",
    })
  }

  // Add any additional headers from advanced parameters
  if (auth.authRequestParams) {
    const authHeaders = generateOAuth2AuthRequestParams(
      auth.authRequestParams,
      envVars,
      showKeyIfSecret
    )

    Object.entries(authHeaders).forEach(([key, value]) => {
      headers.push({
        active: true,
        key,
        value,
        description: "OAuth2 Auth Request Parameter",
      })
    })
  }

  return headers
}

/**
 * Enhanced OAuth2 params generation with advanced parameters
 */
export async function generateEnhancedOAuth2AuthParams(
  auth: ExtendedOAuth2Auth,
  request: HoppRESTRequest,
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTParam[]> {
  const params: HoppRESTParam[] = []

  // Add the standard access_token parameter if addTo is QUERY_PARAMS
  if (auth.addTo === "QUERY_PARAMS") {
    const token = parseTemplateString(
      auth.grantTypeInfo.token,
      envVars,
      false,
      showKeyIfSecret
    )

    params.push({
      active: true,
      key: "access_token",
      value: token,
      description: "",
    })
  }

  // Add any additional query parameters from advanced parameters
  if (auth.authRequestParams) {
    const authParams = generateOAuth2AuthRequestParams(
      auth.authRequestParams,
      envVars,
      showKeyIfSecret
    )

    Object.entries(authParams).forEach(([key, value]) => {
      params.push({
        active: true,
        key,
        value,
        description: "OAuth2 Auth Request Parameter",
      })
    })
  }

  return params
}
