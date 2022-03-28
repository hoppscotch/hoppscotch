import { Observable } from "rxjs"
import { filter } from "rxjs/operators"
import { chain, right, TaskEither } from "fp-ts/lib/TaskEither"
import { flow, pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import { Environment } from "@hoppscotch/data"
import {
  SandboxTestResult,
  runTestScript,
  TestDescriptor,
} from "@hoppscotch/js-sandbox"
import { isRight } from "fp-ts/Either"
import cloneDeep from "lodash/cloneDeep"
import {
  getCombinedEnvVariables,
  getFinalEnvsFromPreRequest,
} from "./preRequest"
import { getEffectiveRESTRequest } from "./utils/EffectiveURL"
import { HoppRESTResponse } from "./types/HoppRESTResponse"
import { createRESTNetworkRequestStream } from "./network"
import { HoppTestData, HoppTestResult } from "./types/HoppTestResult"
import { isJSONContentType } from "./utils/contenttypes"
import { getRESTRequest, setRESTTestResults } from "~/newstore/RESTSession"
import {
  environmentsStore,
  getCurrentEnvironment,
  getEnviroment,
  getGlobalVariables,
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"

const getTestableBody = (
  res: HoppRESTResponse & { type: "success" | "fail" }
) => {
  const contentTypeHeader = res.headers.find(
    (h) => h.key.toLowerCase() === "content-type"
  )

  const rawBody = new TextDecoder("utf-8")
    .decode(res.body)
    .replaceAll("\x00", "")

  const x = pipe(
    // This pipeline just decides whether JSON parses or not
    contentTypeHeader && isJSONContentType(contentTypeHeader.value)
      ? O.of(rawBody)
      : O.none,

    // Try parsing, if failed, go to the fail option
    O.chain((body) => O.tryCatch(() => JSON.parse(body))),

    // If JSON, return that (get), else return just the body string (else)
    O.getOrElse<any | string>(() => rawBody)
  )

  return x
}

const combineEnvVariables = (env: {
  global: Environment["variables"]
  selected: Environment["variables"]
}) => [...env.selected, ...env.global]

export const runRESTRequest$ = (): TaskEither<
  string | Error,
  Observable<HoppRESTResponse>
> =>
  pipe(
    getFinalEnvsFromPreRequest(
      getRESTRequest().preRequestScript,
      getCombinedEnvVariables()
    ),
    chain((envs) => {
      const effectiveRequest = getEffectiveRESTRequest(getRESTRequest(), {
        name: "Env",
        variables: combineEnvVariables(envs),
      })

      const stream = createRESTNetworkRequestStream(effectiveRequest)

      // Run Test Script when request ran successfully
      const subscription = stream
        .pipe(filter((res) => res.type === "success" || res.type === "fail"))
        .subscribe(async (res) => {
          if (res.type === "success" || res.type === "fail") {
            const runResult = await runTestScript(res.req.testScript, envs, {
              status: res.statusCode,
              body: getTestableBody(res),
              headers: res.headers,
            })()

            if (isRight(runResult)) {
              setRESTTestResults(translateToSandboxTestResults(runResult.right))

              setGlobalEnvVariables(runResult.right.envs.global)

              if (environmentsStore.value.currentEnvironmentIndex !== -1) {
                const env = getEnviroment(
                  environmentsStore.value.currentEnvironmentIndex
                )
                updateEnvironment(
                  environmentsStore.value.currentEnvironmentIndex,
                  {
                    name: env.name,
                    variables: runResult.right.envs.selected,
                  }
                )
              }
            } else {
              setRESTTestResults({
                description: "",
                expectResults: [],
                tests: [],
                envDiff: {
                  global: {
                    additions: [],
                    deletions: [],
                    updations: [],
                  },
                  selected: {
                    additions: [],
                    deletions: [],
                    updations: [],
                  },
                },
                scriptError: true,
              })
            }

            subscription.unsubscribe()
          }
        })

      return right(stream)
    })
  )

const getAddedEnvVariables = (
  current: Environment["variables"],
  updated: Environment["variables"]
) => updated.filter((x) => current.findIndex((y) => y.key === x.key) === -1)

const getRemovedEnvVariables = (
  current: Environment["variables"],
  updated: Environment["variables"]
) => current.filter((x) => updated.findIndex((y) => y.key === x.key) === -1)

const getUpdatedEnvVariables = (
  current: Environment["variables"],
  updated: Environment["variables"]
) =>
  pipe(
    updated,
    A.filterMap(
      flow(
        O.of,
        O.bindTo("env"),
        O.bind("index", ({ env }) =>
          pipe(
            current.findIndex((x) => x.key === env.key),
            O.fromPredicate((x) => x !== -1)
          )
        ),
        O.chain(
          O.fromPredicate(
            ({ env, index }) => env.value !== current[index].value
          )
        ),
        O.map(({ env, index }) => ({
          ...env,
          previousValue: current[index].value,
        }))
      )
    )
  )

function translateToSandboxTestResults(
  testDesc: SandboxTestResult
): HoppTestResult {
  const translateChildTests = (child: TestDescriptor): HoppTestData => {
    return {
      description: child.descriptor,
      expectResults: child.expectResults,
      tests: child.children.map(translateChildTests),
    }
  }

  const globals = cloneDeep(getGlobalVariables())
  const env = cloneDeep(getCurrentEnvironment())

  return {
    description: "",
    expectResults: testDesc.tests.expectResults,
    tests: testDesc.tests.children.map(translateChildTests),
    scriptError: false,
    envDiff: {
      global: {
        additions: getAddedEnvVariables(globals, testDesc.envs.global),
        deletions: getRemovedEnvVariables(globals, testDesc.envs.global),
        updations: getUpdatedEnvVariables(globals, testDesc.envs.global),
      },
      selected: {
        additions: getAddedEnvVariables(env.variables, testDesc.envs.selected),
        deletions: getRemovedEnvVariables(
          env.variables,
          testDesc.envs.selected
        ),
        updations: getUpdatedEnvVariables(
          env.variables,
          testDesc.envs.selected
        ),
      },
    },
  }
}
