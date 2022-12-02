import { runPreRequestScript } from "@hoppscotch/js-sandbox"
import { Environment } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"
import {
  getCurrentEnvironment,
  getGlobalVariables,
} from "~/newstore/environments"

export const getCombinedEnvVariables = () => ({
  global: cloneDeep(getGlobalVariables()),
  selected: cloneDeep(getCurrentEnvironment().variables),
})

export const getFinalEnvsFromPreRequest = (
  script: string,
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
  }
) => runPreRequestScript(script, envs)
