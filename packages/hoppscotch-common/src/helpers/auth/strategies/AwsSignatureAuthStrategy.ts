import {
  parseTemplateString,
  HoppRESTAuth,
  HoppRESTRequest,
  Environment,
  HoppRESTHeader,
  HoppRESTParam,
} from "@hoppscotch/data"
import { AuthStrategy } from "../AuthRegistry"
import { AwsV4Signer } from "aws4fetch"
import { getFinalBodyFromRequest } from "~/helpers/utils/EffectiveURL"

export class AwsSignatureAuthStrategy implements AuthStrategy {
  readonly authType = "aws-signature"

  async generateHeaders(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret = false
  ): Promise<HoppRESTHeader[]> {
    if (auth.authType !== "aws-signature" || auth.addTo !== "HEADERS") return []

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

  async generateParams(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret = false
  ): Promise<HoppRESTParam[]> {
    if (auth.authType !== "aws-signature" || auth.addTo !== "QUERY_PARAMS")
      return []

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

  hasConflict(auth: HoppRESTAuth, existingHeaders: HoppRESTHeader[]): boolean {
    if (auth.authType !== "aws-signature" || auth.addTo !== "HEADERS")
      return false
    return existingHeaders.some((h) => h.key.toLowerCase() === "authorization")
  }
}
