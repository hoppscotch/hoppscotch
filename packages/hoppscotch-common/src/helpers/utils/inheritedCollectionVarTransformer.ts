import { AggregateEnvironment } from "~/newstore/environments"
import { HoppInheritedProperty } from "../types/HoppInheritedProperties"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { getService } from "~/modules/dioc"
import { HoppCollectionVariable } from "@hoppscotch/data"

const getCurrentValue = (
  isSecret: boolean,
  varIndex: number,
  collectionID: string,
  showSecret: boolean = false
) => {
  //collection variables current value and secret value
  const secretEnvironmentService = getService(SecretEnvironmentService)
  const currentEnvironmentValueService = getService(CurrentValueService)

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
 * Function to transform inherited collection variables into an array of `AggregateEnvironment` objects.
 * @param variables - The inherited collection variables to transform.
 * @param showSecret - Whether to show secret values in the transformed variables.
 * @returns An array of `AggregateEnvironment` objects representing the transformed collection variables.
 */
export const transformInheritedCollectionVariablesToAggregateEnv = (
  variables: HoppInheritedProperty["variables"],
  showSecret: boolean = true
): AggregateEnvironment[] => {
  return variables.flatMap(({ parentID, inheritedVariables }) =>
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
