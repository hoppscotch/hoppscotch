import { Environment } from "@hoppscotch/data"
import { stripSecretVariableValuesForWire } from "~/helpers/secretVariables"

export const environmentsExporter = (myEnvironments: Environment[]) => {
  const stripped = myEnvironments.map((env) => ({
    ...env,
    variables: stripSecretVariableValuesForWire(env.variables),
  }))
  return JSON.stringify(stripped, null, 2)
}
