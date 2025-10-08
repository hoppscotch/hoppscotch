import {
  Cookie,
  Environment,
  HoppCollectionVariable,
  HoppRESTHeader,
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

import { runPreRequestScript, runTestScript } from "@hoppscotch/js-sandbox/web"
import { useSetting } from "~/composables/settings"
import { getService } from "~/modules/dioc"
import {
  environmentsStore,
  getCurrentEnvironment,
  getEnvironment,
  getGlobalVariables,
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"
import { platform } from "~/platform"
import { CookieJarService } from "~/services/cookie-jar.service"
import {
  CurrentValueService,
  Variable,
} from "~/services/current-environment-value.service"
import {
  SecretEnvironmentService,
  SecretVariable,
} from "~/services/secret-environment.service"
import { HoppTab } from "~/services/tab"
import { updateTeamEnvironment } from "./backend/mutations/TeamEnvironment"
import { createRESTNetworkRequestStream } from "./network"
import { HoppRequestDocument } from "./rest/document"
import {
  getTemporaryVariables,
  setTemporaryVariables,
} from "./runner/temp_envs"
import { HoppRESTResponse } from "./types/HoppRESTResponse"
import { HoppTestData, HoppTestResult } from "./types/HoppTestResult"
import { getEffectiveRESTRequest } from "./utils/EffectiveURL"
import { getCombinedEnvVariables } from "./utils/environments"
import {
  OutgoingSandboxPostRequestWorkerMessage,
  OutgoingSandboxPreRequestWorkerMessage,
} from "./workers/sandbox.worker"
import { transformInheritedCollectionVariablesToAggregateEnv } from "./utils/inheritedCollectionVarTransformer"
import { isJSONContentType } from "./utils/contenttypes"

const sandboxWorker = new Worker(
  new URL("./workers/sandbox.worker.ts", import.meta.url),
  {
    type: "module",
  }
)

const secretEnvironmentService = getService(SecretEnvironmentService)
const currentEnvironmentValueService = getService(CurrentValueService)
const cookieJarService = getService(CookieJarService)

const EXPERIMENTAL_SCRIPTING_SANDBOX = useSetting(
  "EXPERIMENTAL_SCRIPTING_SANDBOX"
)

export const getTestableBody = (
  res: HoppRESTResponse & { type: "success" | "fail" }
) => {
  const contentTypeHeader = res.headers.find(
    (h: HoppRESTHeader) => h.key.toLowerCase() === "content-type"
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
          initialValue: e.initialValue ?? "",
        })

        // create a new object with cleared values for secret variables
        // so that these values don't get saved in the environment
        return {
          key: e.key,
          secret: e.secret,
          initialValue: e.secret ? "" : (e.initialValue ?? ""),
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
 * Get the environment variable value from the secret environment service
 * @param envID The environment ID
 * @param index The index of the environment variable
 * @returns Current value and initial value of the environment variable
 */
const getSecretEnvironmentVariableValue = (
  envID: string,
  index: number
): {
  value: string
  initialValue?: string
} | null => {
  return secretEnvironmentService.getSecretEnvironmentVariableValue(
    envID,
    index
  )
}

/**
 * Get the environment variable value from the current environment
 * @param envID The environment ID
 * @param index The index of the environment variable
 * @param isSecret Whether the environment variable is a secret
 * @returns Current value of the environment variable
 */
const getEnvironmentVariableValue = (
  envID: string,
  index: number
): string | undefined => {
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

const delegatePreRequestScriptRunner = (
  request: HoppRESTRequest,
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
    temp: Environment["variables"]
  },
  cookies: Cookie[] | null
): Promise<E.Either<string, SandboxPreRequestResult>> => {
  const { preRequestScript } = request

  if (!EXPERIMENTAL_SCRIPTING_SANDBOX.value) {
    return runPreRequestScript(preRequestScript, {
      envs,
      experimentalScriptingSandbox: false,
    })
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
      envs,
      request: JSON.stringify(request),
      cookies: cookies ? JSON.stringify(cookies) : null,
    })
  })
}

const runPostRequestScript = (
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  response: HoppRESTResponse,
  cookies: Cookie[] | null
): Promise<E.Either<string, SandboxTestResult>> => {
  const { testScript } = request

  if (!EXPERIMENTAL_SCRIPTING_SANDBOX.value) {
    return runTestScript(testScript, {
      envs,
      response,
      experimentalScriptingSandbox: false,
    })
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
      envs,
      request: JSON.stringify(request),
      response,
      cookies: cookies ? JSON.stringify(cookies) : null,
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

  const cookieJarEntries = getCookieJarEntries()

  const { request, inheritedProperties } = tab.value.document

  const requestAuth =
    request.auth.authType === "inherit" && request.auth.authActive
      ? inheritedProperties?.auth.inheritedAuth
      : request.auth

  const inheritedHeaders = inheritedProperties?.headers
    ?.filter((header) => header.inheritedHeader)
    .map((header) => header.inheritedHeader!)

  const requestHeaders: HoppRESTHeaders = [
    ...(inheritedHeaders ?? []),
    ...request.headers,
  ]

  const resolvedRequest = {
    ...tab.value.document.request,
    auth: requestAuth ?? { authType: "none", authActive: false },
    headers: requestHeaders,
  }

  const res = delegatePreRequestScriptRunner(
    resolvedRequest,
    getCombinedEnvVariables(),
    cookieJarEntries
  ).then(async (preRequestScriptResult) => {
    if (cancelCalled) return E.left("cancellation" as const)

    if (E.isLeft(preRequestScriptResult)) {
      console.error(preRequestScriptResult.left)
      return E.left("script_fail" as const)
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
      ...resolvedRequest,
      ...(preRequestScriptResult.right.updatedRequest ?? {}),
    }

    // Propagate changes to request variables from the scripting context to the UI
    tab.value.document.request.requestVariables = finalRequest.requestVariables

    const finalEnvs = {
      environments: preRequestScriptResult.right.updatedEnvs,
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
            preRequestScriptResult.right.updatedEnvs,
            res.req,
            {
              status: res.statusCode,
              body: getTestableBody(res),
              headers: res.headers,
              statusText: res.statusText,
              responseTime: res.meta.responseDuration,
            },
            preRequestScriptResult.right.updatedCookies ?? null
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

            const updatedCookies = postRequestScriptResult.right.updatedCookies

            if (updatedCookies) {
              const newCookieMap = new Map<string, Cookie[]>()

              for (const cookie of updatedCookies) {
                const domain = cookie.domain

                if (!newCookieMap.has(domain)) {
                  newCookieMap.set(domain, [])
                }

                newCookieMap.get(domain)!.push(cookie)
              }

              cookieJarService.cookieJar.value = newCookieMap
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

const getCookieJarEntries = () => {
  // Exclusive to the Desktop App
  if (!platform.platformFeatureFlags.cookiesEnabled) {
    return null
  }

  const cookieJarEntries = Array.from(
    cookieJarService.cookieJar.value.values()
  ).flatMap((cookies) => cookies)

  return cookieJarEntries
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
      updatedRequest: HoppRESTRequest
    }>
  | undefined
> {
  const cookieJarEntries = getCookieJarEntries()

  return delegatePreRequestScriptRunner(
    request,
    getCombinedEnvVariables(),
    cookieJarEntries
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

    // Calculate the final updated request after pre-request script changes
    const finalRequest = {
      ...request,
      ...(preRequestScriptResult.right.updatedRequest ?? {}),
    }

    const effectiveRequest = await getEffectiveRESTRequest(finalRequest, {
      id: "env-id",
      v: 2,
      name: "Env",
      variables: filterNonEmptyEnvironmentVariables(
        combineEnvVariables({
          environments: {
            ...preRequestScriptResult.right.updatedEnvs,
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
            preRequestScriptResult.right.updatedEnvs,
            res.req,
            {
              status: res.statusCode,
              body: getTestableBody(res),
              headers: res.headers,
              statusText: res.statusText,
              responseTime: res.meta.responseDuration,
            },
            preRequestScriptResult.right.updatedCookies ?? null
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
              updatedRequest: finalRequest,
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
            updatedRequest: finalRequest,
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

// Helper to resolve currentValue & initialValue for (secret/non-secret) env vars
const resolveEnvVars = (
  envID: string,
  vars: Environment["variables"]
): Environment["variables"] =>
  vars.map((v, index) => {
    const secretMeta = v.secret
      ? getSecretEnvironmentVariableValue(envID, index)
      : null
    return {
      ...v,
      currentValue:
        (v.secret
          ? secretMeta?.value
          : getEnvironmentVariableValue(envID, index)) ?? "",
      // fallback to var initialValue if secretMeta is not found
      initialValue:
        (v.secret ? secretMeta?.initialValue : "") ?? v.initialValue,
    }
  })

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

  const globals = resolveEnvVars("Global", cloneDeep(getGlobalVariables()))
  const { id: currentEnvID, variables: currentEnvVariables } =
    getCurrentEnvironment()
  const envVars = resolveEnvVars(currentEnvID, currentEnvVariables)

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
