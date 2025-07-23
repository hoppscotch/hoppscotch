import {
  Environment,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTRequest,
  parseTemplateString,
} from "@hoppscotch/data"
import { AwsV4Signer } from "aws4fetch"
import { getFinalBodyFromRequest } from "~/helpers/utils/EffectiveURL"

function processQueryParameters(
  request: HoppRESTRequest,
  envVars: Environment["variables"],
  baseUrl: string
): { url: URL; sortedParams: Array<{ key: string; value: string }> } {
  const url = new URL(baseUrl)

  // add existing query parameters from the request in lexicographical order as per AWS documentation
  const sortedParams = (request.params || [])
    .filter((param) => param.active && param.key !== "")
    .map((param) => ({
      key: parseTemplateString(param.key, envVars),
      value: parseTemplateString(param.value, envVars),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))

  sortedParams.forEach((param) => {
    url.searchParams.append(param.key, param.value)
  })

  return { url, sortedParams }
}

export async function generateAwsSignatureAuthHeaders(
  auth: HoppRESTAuth & { authType: "aws-signature" },
  request: HoppRESTRequest,
  envVars: Environment["variables"]
): Promise<HoppRESTHeader[]> {
  if (auth.addTo !== "HEADERS") return []

  const currentDate = new Date()
  const amzDate = currentDate.toISOString().replace(/[:-]|\.\d{3}/g, "")
  const { method, endpoint } = request

  const body = getFinalBodyFromRequest(request, envVars)

  // the full URL including existing query parameters
  const baseUrl = parseTemplateString(endpoint, envVars)
  const { url } = processQueryParameters(request, envVars, baseUrl)

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
    url: url.toString(),
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
  envVars: Environment["variables"]
): Promise<HoppRESTParam[]> {
  if (auth.addTo !== "QUERY_PARAMS") return []

  const currentDate = new Date()
  const amzDate = currentDate.toISOString().replace(/[:-]|\.\d{3}/g, "")

  // the full URL including existing query parameters
  const baseUrl = parseTemplateString(request.endpoint, envVars)
  const { url, sortedParams } = processQueryParameters(
    request,
    envVars,
    baseUrl
  )

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
    url: url.toString(),
  })

  const sign = await signer.sign()
  const params: HoppRESTParam[] = []

  // Get the original parameters to exclude them from the returned auth params
  const originalParams = new Set(sortedParams.map((param) => param.key))

  // Only return AWS signature parameters, not the original request parameters
  for (const [key, value] of sign.url.searchParams) {
    if (!originalParams.has(key)) {
      params.push({
        active: true,
        key: key,
        value: value,
        description: "",
      })
    }
  }

  return params
}
