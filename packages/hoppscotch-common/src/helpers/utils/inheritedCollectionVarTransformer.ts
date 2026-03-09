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
  parentID?: string
): HoppCollectionVariable[] =>
  parentID
    ? variables.map((variable, index) => ({
        ...variable,
        currentValue:
          getCurrentValue(variable.secret, index, parentID) ??
          variable.currentValue,
      }))
    : []
