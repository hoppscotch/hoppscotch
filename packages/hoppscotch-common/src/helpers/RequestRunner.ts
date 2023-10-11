import { Observable, Subject } from "rxjs"
import { filter } from "rxjs/operators"
import { flow, pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import { Environment } from "@hoppscotch/data"
import {
  SandboxTestResult,
  runTestScript,
  TestDescriptor,
} from "@hoppscotch/js-sandbox"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import {
  getCombinedEnvVariables,
  getFinalEnvsFromPreRequest,
} from "./preRequest"
import { getEffectiveRESTRequest } from "./utils/EffectiveURL"
import { HoppRESTResponse } from "./types/HoppRESTResponse"
import { createRESTNetworkRequestStream } from "./network"
import { HoppTestData, HoppTestResult } from "./types/HoppTestResult"
import { isJSONContentType } from "./utils/contenttypes"
import { updateTeamEnvironment } from "./backend/mutations/TeamEnvironment"
import {
  environmentsStore,
  getCurrentEnvironment,
  getEnvironment,
  getGlobalVariables,
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"
import { Ref } from "vue"
import { HoppTab } from "~/services/tab"
import { HoppRESTDocument } from "./rest/document"

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

export const executedResponses$ = new Subject<
  HoppRESTResponse & { type: "success" | "fail " }
>()

export function runRESTRequest$(
  tab: Ref<HoppTab<HoppRESTDocument>>
): [
  () => void,
  Promise<
    | E.Left<"script_fail" | "cancellation">
    | E.Right<Observable<HoppRESTResponse>>
  >,
] {
  let cancelCalled = false
  let cancelFunc: (() => void) | null = null

  const cancel = () => {
    cancelCalled = true
    cancelFunc?.()
  }

  const res = getFinalEnvsFromPreRequest(
    tab.value.document.request.preRequestScript,
    getCombinedEnvVariables()
  )().then((envs) => {
    if (cancelCalled) return E.left("cancellation" as const)

    if (E.isLeft(envs)) {
      console.error(envs.left)
      return E.left("script_fail" as const)
    }

    const effectiveRequest = getEffectiveRESTRequest(
      tab.value.document.request,
      {
        name: "Env",
        variables: combineEnvVariables(envs.right),
      }
    )

    const [stream, cancelRun] = createRESTNetworkRequestStream(effectiveRequest)
    cancelFunc = cancelRun

    const subscription = stream
      .pipe(filter((res) => res.type === "success" || res.type === "fail"))
      .subscribe(async (res) => {
        if (res.type === "success" || res.type === "fail") {
          executedResponses$.next(
            // @ts-expect-error Typescript can't figure out this inference for some reason
            res
          )

          const runResult = await runTestScript(
            res.req.testScript,
            envs.right,
            {
              status: res.statusCode,
              body: getTestableBody(res),
              headers: res.headers,
            }
          )()

          if (E.isRight(runResult)) {
            tab.value.document.testResults = translateToSandboxTestResults(
              runResult.right
            )

            setGlobalEnvVariables(runResult.right.envs.global)

            if (
              environmentsStore.value.selectedEnvironmentIndex.type === "MY_ENV"
            ) {
              const env = getEnvironment({
                type: "MY_ENV",
                index: environmentsStore.value.selectedEnvironmentIndex.index,
              })
              updateEnvironment(
                environmentsStore.value.selectedEnvironmentIndex.index,
                {
                  ...env,
                  variables: runResult.right.envs.selected,
                }
              )
            } else if (
              environmentsStore.value.selectedEnvironmentIndex.type ===
              "TEAM_ENV"
            ) {
              const env = getEnvironment({
                type: "TEAM_ENV",
              })
              pipe(
                updateTeamEnvironment(
                  JSON.stringify(runResult.right.envs.selected),
                  environmentsStore.value.selectedEnvironmentIndex.teamEnvID,
                  env.name
                )
              )()
            }
          } else {
            tab.value.document.testResults = {
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
            }
          }

          subscription.unsubscribe()
        }
      })

    return E.right(stream)
  })

  return [cancel, res]
}

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
  const env = getCurrentEnvironment()

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
