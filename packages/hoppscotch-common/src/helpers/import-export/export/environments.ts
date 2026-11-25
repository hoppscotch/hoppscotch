import { Environment } from "@hoppscotch/data"
import { stripClientLocalValuesForWire } from "~/helpers/clientLocalVariables"

export const environmentsExporter = (myEnvironments: Environment[]) => {
  const stripped = myEnvironments.map((env) => ({
    ...env,
    variables: stripClientLocalValuesForWire(env.variables),
  }))
  return JSON.stringify(stripped, null, 2)
}
