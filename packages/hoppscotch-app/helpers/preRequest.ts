import { runPreRequestScript } from "@hoppscotch/js-sandbox"
import { Environment } from "@hoppscotch/data"
import {
  getCurrentEnvironment,
  getGlobalVariables,
} from "~/newstore/environments"

export const getCombinedEnvVariables = () => ({
  global: getGlobalVariables(),
  selected: getCurrentEnvironment().variables,
})

export const getFinalEnvsFromPreRequest = (
  script: string,
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
  }
) => runPreRequestScript(script, envs)
