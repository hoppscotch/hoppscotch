import {
  parseTemplateString,
  HoppRESTAuth,
  HoppRESTRequest,
  Environment,
  HoppRESTHeader,
  HoppRESTParam,
} from "@hoppscotch/data"
import { AwsV4Signer } from "aws4fetch"
import { getFinalBodyFromRequest } from "~/helpers/utils/EffectiveURL"

export async function generateAwsSignatureAuthHeaders(
  auth: HoppRESTAuth & { authType: "aws-signature" },
  request: HoppRESTRequest,
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  if (auth.addTo !== "HEADERS") return []

  const currentDate = new Date()
  const amzDate = currentDate.toISOString().replace(/[:-]|\.\d{3}/g, "")
  const { method, endpoint } = request

  const body = getFinalBodyFromRequest(request, envVars)

  const signer = new AwsV4Signer({
    method: method,
    body: body?.toString(),
    datetime: amzDate,
    accessKeyId: parseTemplateString(auth.accessKey, envVars),
    secretAccessKey: parseTemplateString(auth.secretKey, envVars),
    region: parseTemplateString(auth.region, envVars) ?? "us-east-1",
    service: parseTemplateString(auth.serviceName, envVars),
    sessionToken:
      auth.serviceToken && parseTemplateString(auth.serviceToken, envVars),
    url: parseTemplateString(endpoint, envVars),
  })

  const sign = await signer.sign()
  const headers: HoppRESTHeader[] = []

  sign.headers.forEach((value, key) => {
    headers.push({
      active: true,
      key: key,
      value: value,
      description: "",
    })
  })

  return headers
}

export async function generateAwsSignatureAuthParams(
  auth: HoppRESTAuth & { authType: "aws-signature" },
  request: HoppRESTRequest,
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTParam[]> {
  if (auth.addTo !== "QUERY_PARAMS") return []

  const currentDate = new Date()
  const amzDate = currentDate.toISOString().replace(/[:-]|\.\d{3}/g, "")

  const signer = new AwsV4Signer({
    method: request.method,
    datetime: amzDate,
    signQuery: true,
    accessKeyId: parseTemplateString(auth.accessKey, envVars),
    secretAccessKey: parseTemplateString(auth.secretKey, envVars),
    region: parseTemplateString(auth.region, envVars) ?? "us-east-1",
    service: parseTemplateString(auth.serviceName, envVars),
    sessionToken:
      auth.serviceToken && parseTemplateString(auth.serviceToken, envVars),
    url: parseTemplateString(request.endpoint, envVars),
  })

  const sign = await signer.sign()
  const params: HoppRESTParam[] = []

  for (const [key, value] of sign.url.searchParams) {
    params.push({
      active: true,
      key: key,
      value: value,
      description: "",
    })
  }

  return params
}
