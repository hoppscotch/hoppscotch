import { Environment } from "@hoppscotch/data"
import { stripSecretVariableValuesForWire } from "~/helpers/secretVariables"

export const environmentsExporter = (myEnvironments: Environment[]) => {
  // Strip secret values from every env's variables before stringify. The
  // exported JSON is a shareable file — raw secrets must not travel with
  // it. Local secret store retains values for the user's own session.
  const stripped = myEnvironments.map((env) => ({
    ...env,
    variables: stripSecretVariableValuesForWire(env.variables),
  }))
  return JSON.stringify(stripped, null, 2)
}
