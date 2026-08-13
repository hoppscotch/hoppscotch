import { AggregateEnvironment } from "~/newstore/environments"
import { HoppInheritedProperty } from "../types/HoppInheritedProperties"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { getService } from "~/modules/dioc"
import { HoppCollectionVariable } from "@hoppscotch/data"

//collection variables current value and secret value
const secretEnvironmentService = getService(SecretEnvironmentService)
const currentEnvironmentValueService = getService(CurrentValueService)

const getCurrentValue = (
  isSecret: boolean,
  varIndex: number,
  collectionID: string,
  showSecret: boolean = false
) => {
  if (isSecret && showSecret) {
    return secretEnvironmentService.getSecretEnvironmentVariable(
      collectionID,
      varIndex
    )?.value
  }
  return currentEnvironmentValueService.getEnvironmentVariable(
    collectionID,
    varIndex
  )?.currentValue
}

/**
 * Transforms inherited collection variables into a normalized array of `AggregateEnvironment` objects.
 * Ensures no duplicate keys exist — the last encountered value overrides earlier ones.
 *
 * @param variables - The inherited collection variables to transform.
 * @param showSecret - Whether to reveal secret values or mask them.
 * @returns A de-duplicated array of `AggregateEnvironment` objects.
 */
export const transformInheritedCollectionVariablesToAggregateEnv = (
  variables: HoppInheritedProperty["variables"],
  showSecret: boolean = true
): AggregateEnvironment[] => {
  // Flatten the inherited variables into a single array
  const flattened = variables.flatMap(({ parentID, inheritedVariables }) =>
    inheritedVariables.map(
      ({ currentValue, initialValue, key, secret }, index) => ({
        key,
        currentValue:
          getCurrentValue(secret, index, parentID, showSecret) ?? currentValue,
        initialValue,
        sourceEnv: "CollectionVariable",
        secret,
        sourceEnvID: parentID,
      })
    )
  )

  // Later values override earlier ones
  const mapByKey = new Map<string, AggregateEnvironment>()
  flattened.forEach((variable) => {
    mapByKey.set(variable.key, variable)
  })

  return Array.from(mapByKey.values())
}

/**
 * Utility function to populate current values in inherited collection variables.
 * @param variables - The inherited collection variables to populate.
 * @param parentID - The ID of the parent collection from which to inherit values.
 * @returns - An array of `HoppCollectionVariable` objects with populated current values.
 */
export const populateValuesInInheritedCollectionVars = (
  variables: HoppCollectionVariable[],
  parentID?: string,
  /**
   * Second storage key to try when `parentID` misses. Client-local values are
   * stored under `_ref_id ?? id` for personal collections but under the
   * server `id` for team collections, whose `_ref_id` is regenerated on every
   * fetch — passing the server id here serves both key schemes.
   */
  fallbackID?: string
): HoppCollectionVariable[] =>
  parentID
    ? variables.map((variable, index) => ({
        ...variable,
        currentValue:
          getCurrentValue(variable.secret, index, parentID) ??
          (fallbackID && fallbackID !== parentID
            ? getCurrentValue(variable.secret, index, fallbackID)
            : undefined) ??
          variable.currentValue,
      }))
    : []

/**
 * Resolves one level of collection-variable inheritance for the runner walk.
 *
 * Parents arrive already resolved and pass through untouched; only the
 * current collection's own variables are populated here, under its own ID
 * with indices into its own list — the `(collectionID, varIndex)` key shape
 * `CurrentValueService` stores. Never re-resolve the merged array under a
 * single ID: indices collide across owners and read other variables' slots.
 */
export const resolveInheritedVariables = (
  parentVariables: HoppCollectionVariable[],
  ownVariables: HoppCollectionVariable[],
  ownCollectionID?: string,
  ownCollectionFallbackID?: string
): HoppCollectionVariable[] => [
  ...parentVariables,
  ...populateValuesInInheritedCollectionVars(
    ownVariables,
    ownCollectionID,
    ownCollectionFallbackID
  ),
]
