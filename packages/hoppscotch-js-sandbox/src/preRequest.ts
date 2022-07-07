import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import * as qjs from "quickjs-emscripten"
import { Artifacts } from "./apis/artifact"
import ArtifactAPI from "./apis/artifact"
import EnvAPI, { Envs } from "./apis/env"
import {
  api,
  completeAPIs,
  installAPIs,
  Namespaced,
  PreRequestCompleter,
} from "./apiManager"

export type PreRequestScriptReport = {
  envs: Envs
  artifacts: Artifacts
}

export const execPreRequestScript = (
  script: string,
  envs: Envs,
  artifacts: Artifacts
): TE.TaskEither<string, PreRequestScriptReport> =>
  pipe(
    TE.tryCatch(
      async () => await qjs.getQuickJS(),
      (reason) => `QuickJS initialization failed: ${reason}`
    ),
    TE.chain((QuickJS) => {
      const vm = QuickJS.newContext()
      const pw = vm.newObject()

      const apis = [
        api([EnvAPI(envs), Namespaced("env")]),
        api([ArtifactAPI(artifacts), Namespaced("artifact")]),
      ]

      const instances = installAPIs(vm, pw, apis)

      vm.setProp(vm.global, "pw", pw)
      pw.dispose()

      const evalRes = vm.evalCode(script)
      if (evalRes.error) {
        const errorData = vm.dump(evalRes.error)
        evalRes.error.dispose()

        return TE.left(errorData)
      }

      const finalReport = completeAPIs(
        instances,
        PreRequestCompleter({
          envs,
          artifacts,
        })
      )

      vm.dispose()

      return TE.right(finalReport)
    })
  )
