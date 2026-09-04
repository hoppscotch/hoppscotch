import { Environment, HoppRESTRequestVariable } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"

import { getService } from "~/modules/dioc"
import {
  getCurrentEnvironment,
  getGlobalVariables,
  AggregateEnvironment,
} from "~/newstore/environments"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { transformInheritedCollectionVariablesToAggregateEnv } from "./inheritedCollectionVarTransformer"

const secretEnvironmentService = getService(SecretEnvironmentService)
const currentEnvironmentValueService = getService(CurrentValueService)

/**
 * Populate the currentValue of the environment variables and set the secret values
 * @param selected
 * @param global
 * @returns
 */
const unWrapEnvironments = (
  selected: Environment,
  global: Environment["variables"]
) => {
  const resolvedGlobalWithSecrets = global.map((globalVar, index) => {
    const secretVar = secretEnvironmentService.getSecretEnvironmentVariable(
      "Global",
      index
    )
    const currentVar = currentEnvironmentValueService.getEnvironmentVariable(
      "Global",
      index
    )

    if (secretVar) {
      return {
        ...globalVar,
        currentValue: secretVar.value,
        initialValue: secretVar.initialValue ?? "",
      }
    }
    return {
      ...globalVar,
      currentValue: currentVar?.currentValue || globalVar.currentValue || "",
    }
  })

  const resolvedSelectedWithSecrets = selected.variables.map(
    (selectedVar, index) => {
      const secretVar = secretEnvironmentService.getSecretEnvironmentVariable(
        selected.id,
        index
      )
      const currentVar = currentEnvironmentValueService.getEnvironmentVariable(
        selected.id,
        index
      )
      if (secretVar) {
        return {
          ...selectedVar,
          currentValue: secretVar.value,
          initialValue: secretVar.initialValue ?? "",
        }
      }
      return {
        ...selectedVar,
        currentValue:
          currentVar?.currentValue || selectedVar.currentValue || "",
      }
    }
  )

  return {
    global: resolvedGlobalWithSecrets,
    selected: resolvedSelectedWithSecrets,
  }
}

export const getCombinedEnvVariables = (temp?: Environment["variables"]) => {
  const reformedVars = unWrapEnvironments(
    getCurrentEnvironment(),
    getGlobalVariables()
  )
  return {
    global: cloneDeep(reformedVars.global),
    selected: cloneDeep(reformedVars.selected),
    temp: temp ? cloneDeep(temp) : [],
  }
}

// Active request variables → `AggregateEnvironment` rows; `value` populates both
// `currentValue` and `initialValue`.
export const transformRequestVariablesToAggregateEnv = (
  requestVariables: HoppRESTRequestVariable[] | undefined
): AggregateEnvironment[] =>
  (requestVariables ?? [])
    .filter((v) => v.active)
    .map((v) => ({
      key: v.key,
      currentValue: v.value,
      initialValue: v.value,
      sourceEnv: "RequestVariable",
      secret: false,
    }))

// Builds the precedence-ordered variable list for resolving `<<var>>` templates:
// request → collection → environment (highest first). Matches the runtime's
// `combineEnvVariables` ordering, so previews stay in sync with execution. Not
// de-duplicated — wrap with `filterNonEmptyEnvironmentVariables` so an empty
// higher-precedence variable falls through to a lower-precedence one. (The
// current→initial value fallback itself happens later, at resolution time in
// `getResolvedVariableValue`, invoked by `parseTemplateStringE`.)
// `showSecretCollectionValues=false` keeps inherited
// collection secrets masked (used by the inspector / autocomplete).
export const getEffectiveVariablesForRequest = (
  requestVariables: HoppRESTRequestVariable[] | undefined,
  inheritedVariables: HoppInheritedProperty["variables"] | undefined,
  environmentVars: AggregateEnvironment[],
  showSecretCollectionValues = true
): AggregateEnvironment[] => {
  const requestVars = transformRequestVariablesToAggregateEnv(requestVariables)

  const collectionVars = transformInheritedCollectionVariablesToAggregateEnv(
    inheritedVariables ?? [],
    showSecretCollectionValues
  )

  return [...requestVars, ...collectionVars, ...environmentVars]
}

/**
 * De-duplicates a precedence-ordered variable list by key, keeping the first
 * occurrence unless it has no effective value and a later one does — so an empty
 * higher-precedence variable falls through to a lower-precedence one. Values are
 * left untouched; the current→initial fallback is applied at resolution time in
 * `getResolvedVariableValue` (via `parseTemplateStringE`). Shared by the request
 * runner, the editor highlighter, and the environment inspector so all three
 * agree on precedence.
 */
export const filterNonEmptyEnvironmentVariables = <
  T extends { key: string; currentValue?: string; initialValue?: string },
>(
  envs: T[]
): T[] => {
  const hasEffectiveValue = (env: T): boolean =>
    Boolean(env.currentValue || env.initialValue)

  const envsMap = new Map<string, T>()
  envs.forEach((env) => {
    if (envsMap.has(env.key)) {
      const existingEnv = envsMap.get(env.key)
      if (
        existingEnv &&
        !hasEffectiveValue(existingEnv) &&
        hasEffectiveValue(env)
      ) {
        envsMap.set(env.key, env)
      }
    } else {
      envsMap.set(env.key, env)
    }
  })

  return Array.from(envsMap.values())
}

/**
 * Defensively normalizes possibly-legacy env rows to the v2 `AggregateEnvironment`
 * shape (preserving any extra fields), so consumers like
 * `filterNonEmptyEnvironmentVariables` / `parseTemplateStringE` always see a
 * `currentValue`/`initialValue`. Legacy rows shaped `{ key, value }` (e.g. older
 * embed callers) lack those fields and would otherwise resolve to an empty string.
 */
export const normalizeAggregateEnvs = (
  envs: ReadonlyArray<
    Partial<AggregateEnvironment> & { key: string; value?: string }
  >
): AggregateEnvironment[] =>
  envs.map((env) => ({
    ...env,
    currentValue: env.currentValue ?? env.value ?? "",
    initialValue: env.initialValue ?? env.value ?? "",
    sourceEnv: env.sourceEnv ?? "",
    secret: env.secret ?? false,
  }))
