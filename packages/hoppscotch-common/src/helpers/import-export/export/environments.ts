import { Environment } from "@hoppscotch/data"

export const environmentsExporter = (myEnvironments: Environment[]) => {
  return JSON.stringify(myEnvironments, null, 2)
}
