import * as E from "fp-ts/Either"
import { runPreRequestScript } from "@hoppscotch/js-sandbox/web"
import { Environment } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"

import {
  getCurrentEnvironment,
  getGlobalVariables,
} from "~/newstore/environments"
import { TestResult } from "@hoppscotch/js-sandbox"

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
): Promise<E.Either<string, TestResult["envs"]>> =>
  runPreRequestScript(script, envs)
