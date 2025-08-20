import {
  Environment,
  HoppCollectionVariable,
  HoppRESTHeaders,
  HoppRESTRequest,
  HoppRESTRequestVariable,
} from "@hoppscotch/data"
import {
  SandboxPreRequestResult,
  SandboxTestResult,
  TestDescriptor,
  TestResult,
} from "@hoppscotch/js-sandbox"
import * as A from "fp-ts/Array"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { flow, pipe } from "fp-ts/function"
import { cloneDeep } from "lodash-es"
import { Observable, Subject } from "rxjs"
import { filter } from "rxjs/operators"
import { Ref } from "vue"

import { map } from "fp-ts/Either"

import { runTestScript } from "@hoppscotch/js-sandbox/web"
import { getService } from "~/modules/dioc"
import {
  environmentsStore,
  getCurrentEnvironment,
  getEnvironment,
  getGlobalVariables,
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"
import {
  SecretEnvironmentService,
  SecretVariable,
} from "~/services/secret-environment.service"
import { HoppTab } from "~/services/tab"
import { updateTeamEnvironment } from "./backend/mutations/TeamEnvironment"
import { createRESTNetworkRequestStream } from "./network"
import { getFinalEnvsFromPreRequest } from "./preRequest"
import { HoppRequestDocument } from "./rest/document"
import {
  getTemporaryVariables,
  setTemporaryVariables,
} from "./runner/temp_envs"
import {
  CurrentValueService,
  Variable,
} from "~/services/current-environment-value.service"
import { HoppRESTResponse } from "./types/HoppRESTResponse"
import { HoppTestData, HoppTestResult } from "./types/HoppTestResult"
import { getEffectiveRESTRequest } from "./utils/EffectiveURL"
import { isJSONContentType } from "./utils/contenttypes"
import { getCombinedEnvVariables } from "./utils/environments"
import { useSetting } from "~/composables/settings"
import {
  OutgoingSandboxPostRequestWorkerMessage,
  OutgoingSandboxPreRequestWorkerMessage,
} from "./workers/sandbox.worker"
import { transformInheritedCollectionVariablesToAggregateEnv } from "./utils/inheritedCollectionVarTransformer"

const sandboxWorker = new Worker(
  new URL("./workers/sandbox.worker.ts", import.meta.url),
  {
    type: "module",
  }
)

const secretEnvironmentService = getService(SecretEnvironmentService)
const currentEnvironmentValueService = getService(CurrentValueService)

const EXPERIMENTAL_SCRIPTING_SANDBOX = useSetting(
  "EXPERIMENTAL_SCRIPTING_SANDBOX"
)

export const getTestableBody = (
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

/**
 * Combines the environment variables from the request and the selected, global, and temporary environments.
 * The priority is as follows:
 * 1. Request variables
 * 2. Temporary variables (if any)
 * 3. Selected environment variables
 * 4. Global environment variables
 * @param variables The environment variables to combine
 * @returns The combined environment variables
 */
export const combineEnvVariables = (variables: {
  environments: {
    selected: Environment["variables"]
    global: Environment["variables"]
    temp?: Environment["variables"]
  }
  requestVariables: Environment["variables"]
  collectionVariables: Environment["variables"]
}) => [
  ...variables.requestVariables,
  ...variables.collectionVariables,
  ...(variables.environments.temp ?? []),
  ...variables.environments.selected,
  ...variables.environments.global,
]

export const executedResponses$ = new Subject<
  HoppRESTResponse & { type: "success" | "fail " }
>()

/**
 * This will update the environment variables in the current environment
 * and secret environment service.
 * @param envs The environment variables to update
 * @param type Whether the environment variables are global or selected
 * @returns the updated environment variables
 */
const updateEnvironments = (
  envs: Environment["variables"] &
    {
      secret: true
      currentValue: string
      initialValue: string
      key: string
    }[],
  type: "global" | "selected"
) => {
  const currentEnvID =
    type === "selected" ? getCurrentEnvironment().id : "Global"

  const updatedSecretEnvironments: SecretVariable[] = []
  const nonSecretVariables: Variable[] = []

  const updatedEnv = pipe(
    envs,
    A.mapWithIndex((index, e) => {
      if (e.secret) {
        updatedSecretEnvironments.push({
          key: e.key,
          value: e.currentValue ?? "",
          varIndex: index,
        })

        // delete the value from the environment
        // so that it doesn't get saved in the environment

        return {
          key: e.key,
          secret: e.secret,
          initialValue: e.initialValue ?? "",
          currentValue: "",
        }
      }

      nonSecretVariables.push({
        key: e.key,
        isSecret: e.secret ?? false,
        varIndex: index,
        currentValue: e.currentValue ?? "",
      })
      // set the current value as empty string
      // so that it doesn't get saved in the environment
      return {
        key: e.key,
        secret: e.secret,
        initialValue: e.initialValue ?? "",
        currentValue: "",
      }
    })
  )
  if (currentEnvID) {
    secretEnvironmentService.addSecretEnvironment(
      currentEnvID,
      updatedSecretEnvironments
    )

    currentEnvironmentValueService.addEnvironment(
      currentEnvID,
      nonSecretVariables
    )
  }
  return updatedEnv
}

/**
 * Get the environment variable value from the current environment
 * @param envID The environment ID
 * @param index The index of the environment variable
 * @param isSecret Whether the environment variable is a secret
 * @returns The environment variable value
 */
const getEnvironmentVariableValue = (
  envID: string,
  index: number,
  isSecret: boolean
): string | undefined => {
  if (isSecret) {
    return secretEnvironmentService.getSecretEnvironmentVariableValue(
      envID,
      index
    )
  }
  return currentEnvironmentValueService.getEnvironmentVariableValue(
    envID,
    index
  )
}

/**
 * Set currentValue as initialValue if currentValue is empty
 * This is set just for request runtime and it will not be persisted.
 * @param env The environment variable to be transformed
 * @returns The transformed environment variable with currentValue set to initialValue if empty
 */
const getTransformedEnvs = (
  env: Environment["variables"][number]
): Environment["variables"][number] => {
  return {
    ...env,
    currentValue: env.currentValue || env.initialValue,
  }
}

/**
 * Transforms the environment list to a list with unique keys with value
 * and set currentValue as initialValue if currentValue is empty.
 * @param envs The environment list to be transformed
 * @returns The transformed environment list with keys with value
 */
const filterNonEmptyEnvironmentVariables = (
  envs: Environment["variables"]
): Environment["variables"] => {
  const envsMap = new Map<string, Environment["variables"][number]>()
  envs.forEach((env) => {
    const transformedEnv = getTransformedEnvs(env)

    if (envsMap.has(transformedEnv.key)) {
      const existingEnv = envsMap.get(transformedEnv.key)

      if (
        existingEnv &&
        "currentValue" in existingEnv &&
        existingEnv.currentValue === "" &&
        transformedEnv.currentValue !== ""
      ) {
        envsMap.set(transformedEnv.key, transformedEnv)
      }
    } else {
      envsMap.set(transformedEnv.key, transformedEnv)
    }
  })

  return Array.from(envsMap.values())
}

const runPreRequestScript = (
  script: string,
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
    temp: Environment["variables"]
  }
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  if (!EXPERIMENTAL_SCRIPTING_SANDBOX.value) {
    return getFinalEnvsFromPreRequest(script, envs, false)
  }

  return new Promise((resolve) => {
    const handleMessage = (
      event: MessageEvent<OutgoingSandboxPreRequestWorkerMessage>
    ) => {
      if (event.data.type === "PRE_REQUEST_SCRIPT_ERROR") {
        const error =
          event.data.data instanceof Error
            ? event.data.data.message
            : String(event.data.data)

        sandboxWorker.removeEventListener("message", handleMessage)
        resolve(E.left(error))
      }

      if (event.data.type === "PRE_REQUEST_SCRIPT_RESULT") {
        sandboxWorker.removeEventListener("message", handleMessage)
        resolve(event.data.data)
      }
    }

    sandboxWorker.addEventListener("message", handleMessage)

    sandboxWorker.postMessage({
      type: "pre",
      script,
      envs,
    })
  })
}

const runPostRequestScript = (
  script: string,
  envs: TestResult["envs"],
  response: HoppRESTResponse
): Promise<E.Either<string, SandboxTestResult>> => {
  if (!EXPERIMENTAL_SCRIPTING_SANDBOX.value) {
    return runTestScript(script, envs, response, false)
  }

  return new Promise((resolve) => {
    const handleMessage = (
      event: MessageEvent<OutgoingSandboxPostRequestWorkerMessage>
    ) => {
      if (event.data.type === "POST_REQUEST_SCRIPT_ERROR") {
        const error =
          event.data.data instanceof Error
            ? event.data.data.message
            : String(event.data.data)

        sandboxWorker.removeEventListener("message", handleMessage)
        resolve(E.left(error))
      }

      if (event.data.type === "POST_REQUEST_SCRIPT_RESULT") {
        sandboxWorker.removeEventListener("message", handleMessage)
        resolve(event.data.data)
      }
    }

    sandboxWorker.addEventListener("message", handleMessage)

    sandboxWorker.postMessage({
      type: "post",
      script,
      envs,
      response,
    })
  })
}

export function runRESTRequest$(
  tab: Ref<HoppTab<HoppRequestDocument>>
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

  const res = runPreRequestScript(
    tab.value.document.request.preRequestScript,
    getCombinedEnvVariables()
  ).then(async (preRequestScriptResult) => {
    if (cancelCalled) return E.left("cancellation" as const)

    if (E.isLeft(preRequestScriptResult)) {
      console.error(preRequestScriptResult.left)
      return E.left("script_fail" as const)
    }

    const requestAuth =
      tab.value.document.request.auth.authType === "inherit" &&
      tab.value.document.request.auth.authActive
        ? tab.value.document.inheritedProperties?.auth.inheritedAuth
        : tab.value.document.request.auth

    let requestHeaders

    const inheritedHeaders =
      tab.value.document.inheritedProperties?.headers.map((header) => {
        if (header.inheritedHeader) {
          return header.inheritedHeader
        }
        return []
      })

    if (inheritedHeaders) {
      requestHeaders = [
        ...inheritedHeaders,
        ...tab.value.document.request.headers,
      ]
    } else {
      requestHeaders = [...tab.value.document.request.headers]
    }

    const finalRequestVariables =
      tab.value.document.request.requestVariables.map(
        (v: HoppRESTRequestVariable) => {
          if (v.active) {
            return {
              key: v.key,
              initialValue: v.value,
              currentValue: v.value,
              secret: false,
            }
          }
          return []
        }
      )

    const collectionVariables =
      transformInheritedCollectionVariablesToAggregateEnv(
        tab.value.document.inheritedProperties?.variables || []
      ).map(({ key, initialValue, currentValue, secret }) => ({
        key,
        initialValue,
        currentValue,
        secret,
      }))

    const finalRequest = {
      ...tab.value.document.request,
      auth: requestAuth ?? { authType: "none", authActive: false },
      headers: requestHeaders as HoppRESTHeaders,
    }

    const finalEnvs = {
      environments: preRequestScriptResult.right.envs,
      requestVariables: finalRequestVariables as Environment["variables"],
      collectionVariables,
    }

    const finalEnvsWithNonEmptyValues = filterNonEmptyEnvironmentVariables(
      combineEnvVariables(finalEnvs)
    )

    const effectiveRequest = await getEffectiveRESTRequest(finalRequest, {
      id: "env-id",
      v: 2,
      name: "Env",
      variables: finalEnvsWithNonEmptyValues,
    })

    const [stream, cancelRun] =
      await createRESTNetworkRequestStream(effectiveRequest)
    cancelFunc = cancelRun

    const subscription = stream
      .pipe(filter((res) => res.type === "success" || res.type === "fail"))
      .subscribe(async (res) => {
        if (res.type === "success" || res.type === "fail") {
          executedResponses$.next(res)

          const postRequestScriptResult = await runPostRequestScript(
            res.req.testScript,
            preRequestScriptResult.right.envs,
            {
              status: res.statusCode,
              body: getTestableBody(res),
              headers: res.headers,
            }
          )

          if (E.isRight(postRequestScriptResult)) {
            // set the response in the tab so that multiple tabs can run request simultaneously
            tab.value.document.response = res

            // Combine console entries from pre and post request scripts
            const combinedResult = pipe(
              postRequestScriptResult,
              map((result) => ({
                ...result,
                consoleEntries: [
                  ...(preRequestScriptResult.right.consoleEntries ?? []),
                  ...(result.consoleEntries ?? []),
                ],
              }))
            ) as E.Right<SandboxTestResult>

            tab.value.document.testResults = translateToSandboxTestResults(
              combinedResult.right
            )
            updateEnvsAfterTestScript(combinedResult)
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
              consoleEntries: [],
            }
          }

          subscription.unsubscribe()
        }
      })

    return E.right(stream)
  })

  return [cancel, res]
}

function updateEnvsAfterTestScript(runResult: E.Right<SandboxTestResult>) {
  const globalEnvVariables = updateEnvironments(
    // @ts-expect-error Typescript can't figure out this inference for some reason
    runResult.right.envs.global,
    "global"
  )

  setGlobalEnvVariables({
    v: 2,
    variables: globalEnvVariables,
  })
  const selectedEnvVariables = updateEnvironments(
    // @ts-expect-error Typescript can't figure out this inference for some reason
    cloneDeep(runResult.right.envs.selected),
    "selected"
  )
  if (environmentsStore.value.selectedEnvironmentIndex.type === "MY_ENV") {
    const env = getEnvironment({
      type: "MY_ENV",
      index: environmentsStore.value.selectedEnvironmentIndex.index,
    })
    updateEnvironment(environmentsStore.value.selectedEnvironmentIndex.index, {
      name: env.name,
      v: 2,
      id: "id" in env ? env.id : "",
      variables: selectedEnvVariables,
    })
  } else if (
    environmentsStore.value.selectedEnvironmentIndex.type === "TEAM_ENV"
  ) {
    const env = getEnvironment({
      type: "TEAM_ENV",
    })
    pipe(
      updateTeamEnvironment(
        JSON.stringify(selectedEnvVariables),
        environmentsStore.value.selectedEnvironmentIndex.teamEnvID,
        env.name
      )
    )()
  }
}

/**
 * Run the test runner request
 * @param request The request to run
 * @param persistEnv Whether to persist the environment variables after running the test script
 * @returns The response and the test result
 */

export function runTestRunnerRequest(
  request: HoppRESTRequest,
  persistEnv = true,
  inheritedVariables: HoppCollectionVariable[] = []
): Promise<
  | E.Left<"script_fail">
  | E.Right<{
      response: HoppRESTResponse
      testResult: HoppTestResult
    }>
  | undefined
> {
  return runPreRequestScript(
    request.preRequestScript,
    getCombinedEnvVariables()
  ).then(async (preRequestScriptResult) => {
    if (E.isLeft(preRequestScriptResult)) {
      console.error(preRequestScriptResult.left)
      return E.left("script_fail" as const)
    }

    const finalRequestVariables = pipe(
      request.requestVariables,
      A.filter(({ active }) => active),
      A.map(({ key, value }) => ({
        key,
        initialValue: value,
        currentValue: value,
        secret: false,
      }))
    )

    const effectiveRequest = await getEffectiveRESTRequest(request, {
      id: "env-id",
      v: 2,
      name: "Env",
      variables: filterNonEmptyEnvironmentVariables(
        combineEnvVariables({
          environments: {
            ...preRequestScriptResult.right.envs,
            temp: !persistEnv ? getTemporaryVariables() : [],
          },
          requestVariables: finalRequestVariables,
          collectionVariables: inheritedVariables,
        })
      ),
    })

    const [stream] = createRESTNetworkRequestStream(effectiveRequest)

    const requestResult = stream
      .pipe(filter((res) => res.type === "success" || res.type === "fail"))
      .toPromise()
      .then(async (res) => {
        if (res?.type === "success" || res?.type === "fail") {
          executedResponses$.next(res)

          const postRequestScriptResult = await runPostRequestScript(
            res.req.testScript,
            preRequestScriptResult.right.envs,
            {
              status: res.statusCode,
              body: getTestableBody(res),
              headers: res.headers,
            }
          )

          if (E.isRight(postRequestScriptResult)) {
            // Combine console entries from pre and post request scripts
            const combinedResult = {
              ...postRequestScriptResult.right,
              consoleEntries: [
                ...(preRequestScriptResult.right.consoleEntries ?? []),
                ...(postRequestScriptResult.right.consoleEntries ?? []),
              ],
            }

            const sandboxTestResult =
              translateToSandboxTestResults(combinedResult)

            // Update the environment variables after running the test script when persistEnv is true. else store the updated environment variables in the store as a temporary variable.
            if (persistEnv) {
              updateEnvsAfterTestScript(postRequestScriptResult)
            } else {
              // Combine global and selected environment changes
              const allChanges = [
                ...postRequestScriptResult.right.envs.global,
                ...postRequestScriptResult.right.envs.selected,
              ]

              setTemporaryVariables(allChanges)
            }

            return E.right({
              response: res,
              testResult: sandboxTestResult,
            })
          }
          const sandboxTestResult = {
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
            consoleEntries: [],
          }
          return E.right({
            response: res,
            testResult: sandboxTestResult,
          })
        }
      })

    if (requestResult) {
      return requestResult
    }

    return E.left("script_fail")
  })
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
            ({ env, index }) => env.currentValue !== current[index].currentValue
          )
        ),
        O.map(({ env, index }) => ({
          ...env,
          previousValue: current[index].currentValue,
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

  const globals = cloneDeep(getGlobalVariables()).map((g, index) => ({
    ...g,
    currentValue: getEnvironmentVariableValue("Global", index, g.secret) ?? "",
  }))

  const envVars = getCurrentEnvironment().variables.map((e, index) => ({
    ...e,
    currentValue:
      getEnvironmentVariableValue(
        getCurrentEnvironment().id,
        index,
        e.secret
      ) ?? "",
  }))

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
        additions: getAddedEnvVariables(envVars, testDesc.envs.selected),
        deletions: getRemovedEnvVariables(envVars, testDesc.envs.selected),
        updations: getUpdatedEnvVariables(envVars, testDesc.envs.selected),
      },
    },
    consoleEntries: testDesc.consoleEntries,
  }
}
