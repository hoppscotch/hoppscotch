import * as E from "fp-ts/Either"
import { runPreRequestScript } from "@hoppscotch/js-sandbox/web"
import { Environment } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"

import {
  getCurrentEnvironment,
  getGlobalVariables,
} from "~/newstore/environments"
import { TestDescriptor } from "@hoppscotch/js-sandbox"

type TestResultWithSelectedEnv = {
  tests: TestDescriptor[]
  envs: {
    global: Environment["variables"]
    selected: Environment
  }
}

export const getCombinedEnvVariables = () => ({
  global: cloneDeep(getGlobalVariables()),
  selected: cloneDeep(getCurrentEnvironment()),
})

export const getFinalEnvsFromPreRequest = (
  script: string,
  envs: {
    global: Environment["variables"]
    selected: Environment
  }
): Promise<E.Either<string, TestResultWithSelectedEnv["envs"]>> =>
  runPreRequestScript(script, envs)
