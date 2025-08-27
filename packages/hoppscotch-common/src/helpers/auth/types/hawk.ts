import {
  parseTemplateString,
  calculateHawkHeader,
  HoppRESTAuth,
  HoppRESTRequest,
  Environment,
  HoppRESTHeader,
} from "@hoppscotch/data"
import { getFinalBodyFromRequest } from "~/helpers/utils/EffectiveURL"

export async function generateHawkAuthHeaders(
  auth: HoppRESTAuth,
  request: HoppRESTRequest,
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  if (auth.authType !== "hawk") return []

  const { method, endpoint, body } = request

  // Get the body content for payload hash calculation
  const payload = getFinalBodyFromRequest(request, envVars, showKeyIfSecret)

  const hawkHeader = await calculateHawkHeader({
    url: parseTemplateString(endpoint, envVars),
    method: method,
    id: parseTemplateString(auth.authId, envVars),
    key: parseTemplateString(auth.authKey, envVars),
    algorithm: auth.algorithm,

    // Add content type and payload
    contentType: body.contentType,
    payload,

    // advanced parameters (optional)
    includePayloadHash: auth.includePayloadHash,
    nonce: auth.nonce ? parseTemplateString(auth.nonce, envVars) : undefined,
    ext: auth.ext ? parseTemplateString(auth.ext, envVars) : undefined,
    app: auth.app ? parseTemplateString(auth.app, envVars) : undefined,
    dlg: auth.dlg ? parseTemplateString(auth.dlg, envVars) : undefined,
    timestamp: auth.timestamp
      ? parseInt(parseTemplateString(auth.timestamp, envVars), 10)
      : undefined,
  })

  return [
    {
      active: true,
      key: "Authorization",
      value: hawkHeader,
      description: "",
    },
  ]
}
