import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import * as qjs from "quickjs-emscripten"
import { Environment } from "@hoppscotch/data"
import {
  api,
  completeAPIs,
  installAPIs,
  Namespaced,
  TestScriptCompleter,
} from "./apiManager"
import TestAPI from "./apis/test"
import EnvAPI from "./apis/env"
import ExpectAPI from "./apis/expect"
import ResponseAPI from "./apis/response"
import ConsoleAPI, { HoppConsole } from "./apis/console"

/**
 * The response object structure exposed to the test script
 */
export type TestResponse = {
  /** Status Code of the response */
  status: number
  /** List of headers returned */
  headers: { key: string; value: string }[]
  /**
   * Body of the response, this will be the JSON object if it is a JSON content type, else body string
   */
  body: string | object
}

/**
 * The result of an expectation statement
 */
type ExpectResult = { status: "pass" | "fail" | "error"; message: string } // The expectation failed (fail) or errored (error)

/**
 * An object defining the result of the execution of a
 * test block
 */
export type TestDescriptor = {
  /**
   * The name of the test block
   */
  descriptor: string

  /**
   * Expectation results of the test block
   */
  expectResults: ExpectResult[]

  /**
   * Children test blocks (test blocks inside the test block)
   */
  children: TestDescriptor[]
}

/**
 * Defines the result of a test script execution
 */
export type TestScriptReport = {
  tests: TestDescriptor[]
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
  }
  consoles: Array<HoppConsole>
}

export const execTestScript = (
  script: string,
  envs: TestScriptReport["envs"],
  response: TestResponse
): TE.TaskEither<string, TestScriptReport> =>
  pipe(
    TE.tryCatch(
      async () => await qjs.getQuickJS(),
      (reason) => `QuickJS initialization failed: ${reason}`
    ),
    TE.chain((QuickJS) => {
      const vm = QuickJS.newContext()
      const pw = vm.newObject()

      const apis = [
        api([ConsoleAPI(script), Namespaced("console")]),
        api([TestAPI(), Namespaced("test")]),
        api([ExpectAPI(), Namespaced("expect")]),
        api([ResponseAPI(response), Namespaced("response")]),
        api([EnvAPI(envs), Namespaced("env")]),
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
        TestScriptCompleter({
          envs,
          tests: [],
          consoles: [],
        })
      )

      vm.dispose()

      return TE.right(finalReport)
    })
  )
