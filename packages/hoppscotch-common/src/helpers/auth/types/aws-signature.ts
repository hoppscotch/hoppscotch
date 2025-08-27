import {
  Environment,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTParams,
  HoppRESTRequest,
  parseTemplateString,
} from "@hoppscotch/data"
import { AwsV4Signer } from "aws4fetch"
import { getFinalBodyFromRequest } from "~/helpers/utils/EffectiveURL"

type SignOptions = {
  auth: HoppRESTAuth & { authType: "aws-signature" }
  request: HoppRESTRequest
  envVars: Environment["variables"]
  signQuery?: boolean
}

function processQueryParameters(
  params: HoppRESTParams,
  envVars: Environment["variables"],
  baseUrl: string
): { url: URL; sortedParams: Array<{ key: string; value: string }> } {
  const url = new URL(baseUrl)

  // add existing query parameters from the request in lexicographical order as per AWS documentation
  const sortedParams = params
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

async function signAWSRequest({
  auth,
  request,
  envVars,
  signQuery = false,
}: SignOptions) {
  const currentDate = new Date()
  const amzDate = currentDate.toISOString().replace(/[:-]|\.\d{3}/g, "")

  const baseUrl = parseTemplateString(request.endpoint, envVars)
  const { url, sortedParams } = processQueryParameters(
    request.params,
    envVars,
    baseUrl
  )

  const accessKeyId = parseTemplateString(auth.accessKey, envVars)
  const secretAccessKey = parseTemplateString(auth.secretKey, envVars)
  const region = parseTemplateString(auth.region, envVars) ?? "us-east-1"
  const service = parseTemplateString(auth.serviceName, envVars)
  const sessionToken = auth.serviceToken
    ? parseTemplateString(auth.serviceToken, envVars)
    : undefined

  const signerConfig: ConstructorParameters<typeof AwsV4Signer>[0] = {
    method: request.method,
    datetime: amzDate,
    accessKeyId,
    secretAccessKey,
    region,
    service,
    sessionToken,
    url: url.toString(),
    signQuery,
  }

  if (!signQuery) {
    const body = getFinalBodyFromRequest(request, envVars)
    signerConfig.body = body?.toString()
  }

  const signer = new AwsV4Signer(signerConfig)
  const sign = await signer.sign()

  return { sign, sortedParams }
}

export async function generateAwsSignatureAuthHeaders(
  auth: HoppRESTAuth & { authType: "aws-signature" },
  request: HoppRESTRequest,
  envVars: Environment["variables"]
): Promise<HoppRESTHeader[]> {
  if (auth.addTo !== "HEADERS") return []

  const { sign } = await signAWSRequest({
    auth,
    request,
    envVars,
    signQuery: false,
  })
  const headers: HoppRESTHeader[] = []

  sign.headers.forEach((value, key) => {
    headers.push({
      active: true,
      key,
      value,
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

  const { sign, sortedParams } = await signAWSRequest({
    auth,
    request,
    envVars,
    signQuery: true,
  })
  const params: HoppRESTParam[] = []

  const originalParams = new Set(sortedParams.map((param) => param.key))

  for (const [key, value] of sign.url.searchParams) {
    if (!originalParams.has(key)) {
      params.push({
        active: true,
        key,
        value,
        description: "",
      })
    }
  }

  return params
}
