import { getService } from "~/modules/dioc"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { parseTemplateStringE } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import {
  getEffectiveVariablesForRequest,
  filterNonEmptyEnvironmentVariables,
} from "../utils/environments"
import {
  AggregateEnvironment,
  getAggregateEnvsWithCurrentValue,
} from "~/newstore/environments"

export const replaceTemplateStringsInObjectValues = <
  T extends Record<string, unknown>,
>(
  obj: T,
  source: "REST" | "GQL" = "REST",
  // A precedence-ordered variable list supplied by the caller, used instead of
  // the active tab's variables (e.g. while editing collection properties,
  // where the active tab is unrelated to the collection being edited).
  variables?: AggregateEnvironment[]
) => {
  let effectiveVars = variables

  if (!effectiveVars) {
    const document =
      getService(WorkspaceTabsService).currentActiveTab.value.document

    // Only a REST request tab has request/collection variables.
    const isRESTRequest = source === "REST" && document.type === "request"

    // Resolve like a sent request: request > collection > environment
    // precedence, active request vars only. The current→initial fallback
    // happens in `parseTemplateStringE`.
    effectiveVars = getEffectiveVariablesForRequest(
      isRESTRequest ? document.request.requestVariables : [],
      isRESTRequest ? document.inheritedProperties?.variables : [],
      getAggregateEnvsWithCurrentValue()
    )
  }

  const envVars = filterNonEmptyEnvironmentVariables(effectiveVars)

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

export const replaceTemplateString = (
  str: string,
  variables?: AggregateEnvironment[]
): string => {
  return replaceTemplateStringsInObjectValues({ value: str }, "REST", variables)
    .value
}
