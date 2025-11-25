import {
  Environment,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTRequest,
} from "@hoppscotch/data"
import {
  generateApiKeyAuthHeaders,
  generateApiKeyAuthParams,
} from "./types/api-key"
import {
  generateAwsSignatureAuthHeaders,
  generateAwsSignatureAuthParams,
} from "./types/aws-signature"
import { generateBasicAuthHeaders } from "./types/basic"
import { generateBearerAuthHeaders } from "./types/bearer"
import { generateDigestAuthHeaders } from "./types/digest"
import { generateHawkAuthHeaders } from "./types/hawk"
import { generateJwtAuthHeaders, generateJwtAuthParams } from "./types/jwt"
import {
  generateOAuth2AuthHeaders,
  generateOAuth2AuthParams,
} from "./types/oauth2"

/**
 * Generate headers for the given auth type using function-based approach
 */
export async function generateAuthHeaders(
  auth: HoppRESTAuth,
  request: HoppRESTRequest,
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  switch (auth.authType) {
    case "basic":
      return generateBasicAuthHeaders(auth, envVars, showKeyIfSecret)
    case "bearer":
      return generateBearerAuthHeaders(auth, envVars, showKeyIfSecret)
    case "api-key":
      return auth.addTo === "HEADERS"
        ? generateApiKeyAuthHeaders(auth, envVars, showKeyIfSecret)
        : []
    case "oauth-2":
      return generateOAuth2AuthHeaders(auth, envVars, showKeyIfSecret)
    case "digest":
      return generateDigestAuthHeaders(auth, request, envVars, showKeyIfSecret)
    case "aws-signature":
      return generateAwsSignatureAuthHeaders(auth, request, envVars)
    case "hawk":
      return generateHawkAuthHeaders(auth, request, envVars, showKeyIfSecret)
    case "jwt":
      return generateJwtAuthHeaders(auth, envVars, showKeyIfSecret)
    default:
      return []
  }
}

/**
 * Generate query parameters for the given auth type using function-based approach
 */
export async function generateAuthParams(
  auth: HoppRESTAuth,
  request: HoppRESTRequest,
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTParam[]> {
  switch (auth.authType) {
    case "api-key":
      return auth.addTo === "QUERY_PARAMS"
        ? generateApiKeyAuthParams(auth, envVars, showKeyIfSecret)
        : []
    case "oauth-2":
      return generateOAuth2AuthParams(auth, envVars, showKeyIfSecret)
    case "aws-signature":
      return generateAwsSignatureAuthParams(auth, request, envVars)
    case "jwt":
      return generateJwtAuthParams(auth, envVars)
    default:
      return []
  }
}
