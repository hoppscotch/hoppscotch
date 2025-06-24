import { getService } from "~/modules/dioc"
import { RESTTabService } from "~/services/tab/rest"
import { parseTemplateStringE } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { getCombinedEnvVariables } from "../utils/environments"

export const replaceTemplateStringsInObjectValues = <
  T extends Record<string, unknown>,
>(
  obj: T,
  source: "REST" | "GQL" = "REST"
) => {
  const envs = getCombinedEnvVariables()
  const restTabsService = getService(RESTTabService)

  const requestVariables =
    source === "REST" &&
    restTabsService.currentActiveTab.value.document.type === "request"
      ? restTabsService.currentActiveTab.value.document.request.requestVariables.map(
          ({ key, value }) => ({
            key,
            value,
            secret: false,
          })
        )
      : []

  // Ensure request variables are prioritized by removing any selected/global environment variables with the same key
  const selectedEnvVars = envs.selected.filter(
    ({ key }) =>
      !requestVariables.some(({ key: reqVarKey }) => reqVarKey === key)
  )
  const globalEnvVars = envs.global.filter(
    ({ key }) =>
      !requestVariables.some(({ key: reqVarKey }) => reqVarKey === key)
  )

  const envVars = [...selectedEnvVars, ...globalEnvVars, ...requestVariables]

  const newObj: Partial<T> = {}

  for (const key in obj) {
    const val = obj[key]

    if (typeof val === "string") {
      const parseResult = parseTemplateStringE(val, envVars)

      newObj[key] = E.isRight(parseResult)
        ? (parseResult.right as T[typeof key])
        : (val as T[typeof key])
    } else {
      newObj[key] = val
    }
  }

  return newObj as T
}

// Auth index file
export { AuthRegistry, authRegistry, type AuthStrategy } from "./AuthRegistry"

// Export individual strategies for advanced usage
export { BasicAuthStrategy } from "./strategies/BasicAuthStrategy"
export { BearerAuthStrategy } from "./strategies/BearerAuthStrategy"
export { ApiKeyAuthStrategy } from "./strategies/ApiKeyAuthStrategy"
export { OAuth2AuthStrategy } from "./strategies/OAuth2AuthStrategy"
export { DigestAuthStrategy } from "./strategies/DigestAuthStrategy"
export { AwsSignatureAuthStrategy } from "./strategies/AwsSignatureAuthStrategy"
export { HawkAuthStrategy } from "./strategies/HawkAuthStrategy"
export { JwtAuthStrategy } from "./strategies/JwtAuthStrategy"
