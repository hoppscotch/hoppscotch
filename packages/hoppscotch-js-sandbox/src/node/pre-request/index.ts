import * as TE from "fp-ts/lib/TaskEither"
import { TestResult } from "~/types"

import { runPreRequestScriptWithFaradayCage } from "./experimental"
import { runPreRequestScriptWithIsolatedVm } from "./legacy"

export const runPreRequestScript = (
  preRequestScript: string,
  envs: TestResult["envs"],
  experimentalScriptingSandbox = true
): TE.TaskEither<string, TestResult["envs"]> =>
  experimentalScriptingSandbox
    ? runPreRequestScriptWithFaradayCage(preRequestScript, envs)
    : runPreRequestScriptWithIsolatedVm(preRequestScript, envs)
