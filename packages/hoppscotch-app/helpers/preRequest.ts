import { runPreRequestScript } from "@hoppscotch/js-sandbox"
import {
  getCurrentEnvironment,
  getGlobalVariables,
} from "~/newstore/environments"

export const getCombinedEnvVariables = () => {
  const variables: { key: string; value: string }[] = [...getGlobalVariables()]

  for (const variable of getCurrentEnvironment().variables) {
    const index = variables.findIndex((v) => variable.key === v.key)

    if (index === -1) {
      variables.push({
        key: variable.key,
        value: variable.value,
      })
    } else {
      variables[index].value = variable.value
    }
  }

  return variables
}

export const getFinalEnvsFromPreRequest = (
  script: string,
  envs: { key: string; value: string }[]
) => runPreRequestScript(script, envs)
