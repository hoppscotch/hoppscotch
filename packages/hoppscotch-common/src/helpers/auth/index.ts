import { getService } from "~/modules/dioc"
import { RESTTabService } from "~/services/tab/rest"
import { parseTemplateStringE } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import {
  getEffectiveVariablesForRequest,
  filterNonEmptyEnvironmentVariables,
} from "../utils/environments"
import { getAggregateEnvsWithCurrentValue } from "~/newstore/environments"

export const replaceTemplateStringsInObjectValues = <
  T extends Record<string, unknown>,
>(
  obj: T,
  source: "REST" | "GQL" = "REST"
) => {
  const document = getService(RESTTabService).currentActiveTab.value.document

  // Only a REST request tab has request/collection variables.
  const isRESTRequest = source === "REST" && document.type === "request"

  // Resolve like a sent request: request > collection > environment precedence,
  // active request vars only. The current→initial fallback happens in
  // `parseTemplateStringE`.
  const envVars = filterNonEmptyEnvironmentVariables(
    getEffectiveVariablesForRequest(
      isRESTRequest ? document.request.requestVariables : [],
      isRESTRequest ? document.inheritedProperties?.variables : [],
      getAggregateEnvsWithCurrentValue()
    )
  )

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

export const replaceTemplateString = (str: string): string => {
  return replaceTemplateStringsInObjectValues({ value: str }).value
}
