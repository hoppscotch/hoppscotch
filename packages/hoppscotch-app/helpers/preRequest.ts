import { runPreRequestScript } from "@hoppscotch/js-sandbox"
import { Environment } from "@hoppscotch/data"
<<<<<<< HEAD
import cloneDeep from "lodash/cloneDeep"
=======
>>>>>>> e0797e4c (feat: introduce APIs to update envs from tests and recursive resolution)
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
