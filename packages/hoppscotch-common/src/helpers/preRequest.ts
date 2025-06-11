import { Environment } from "@hoppscotch/data"
import { runPreRequestScript } from "@hoppscotch/js-sandbox/web"
import * as E from "fp-ts/Either"

import { SandboxPreRequestResult } from "@hoppscotch/js-sandbox"

export const getFinalEnvsFromPreRequest = (
  script: string,
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
    temp: Environment["variables"]
  },
  experimentalScriptingSandbox = true
): Promise<E.Either<string, SandboxPreRequestResult>> =>
  runPreRequestScript(script, envs, experimentalScriptingSandbox)
