import {
  parseTemplateString,
  HoppRESTAuth,
  HoppRESTRequest,
  Environment,
  HoppRESTHeader,
} from "@hoppscotch/data"
import {
  DigestAuthParams,
  fetchInitialDigestAuthInfo,
  generateDigestAuthHeader,
} from "../digest"
import { getFinalBodyFromRequest } from "~/helpers/utils/EffectiveURL"

export async function generateDigestAuthHeaders(
  auth: HoppRESTAuth,
  request: HoppRESTRequest,
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  if (auth.authType !== "digest") return []

  const { method, endpoint } = request

  // Step 1: Fetch the initial auth info (nonce, realm, etc.)
  const authInfo = await fetchInitialDigestAuthInfo(
    parseTemplateString(endpoint, envVars),
    method
  )

  // Get the body content for digest calculation
  const reqBody = getFinalBodyFromRequest(request, envVars, showKeyIfSecret)

  // Step 2: Set up the parameters for the digest authentication header
  const digestAuthParams: DigestAuthParams = {
    username: parseTemplateString(auth.username, envVars),
    password: parseTemplateString(auth.password, envVars),
    realm: auth.realm
      ? parseTemplateString(auth.realm, envVars)
      : authInfo.realm,
    nonce: auth.nonce
      ? parseTemplateString(auth.nonce, envVars)
      : authInfo.nonce,
    endpoint: parseTemplateString(endpoint, envVars),
    method,
    algorithm: auth.algorithm ?? authInfo.algorithm,
    qop: auth.qop ? parseTemplateString(auth.qop, envVars) : authInfo.qop,
    opaque: auth.opaque
      ? parseTemplateString(auth.opaque, envVars)
      : authInfo.opaque,
    reqBody: typeof reqBody === "string" ? reqBody : "",
  }

  // Step 3: Generate the Authorization header
  const authHeaderValue = await generateDigestAuthHeader(digestAuthParams)

  return [
    {
      active: true,
      key: "Authorization",
      value: authHeaderValue,
      description: "",
    },
  ]
}
