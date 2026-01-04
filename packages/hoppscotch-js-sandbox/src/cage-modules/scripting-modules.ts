import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import {
  CageModuleCtx,
  defineCageModule,
  defineSandboxFn,
  defineSandboxObject,
} from "faraday-cage/modules"
import { cloneDeep } from "lodash-es"

import { getStatusReason } from "~/constants/http-status-codes"
import { BaseInputs, TestDescriptor, TestResponse, TestResult } from "~/types"
import postRequestBootstrapCode from "../bootstrap-code/post-request?raw"
import preRequestBootstrapCode from "../bootstrap-code/pre-request?raw"
import { createBaseInputs } from "./utils/base-inputs"
import { createChaiMethods } from "./utils/chai-helpers"
import { createExpectationMethods } from "./utils/expectation-helpers"
import { createRequestSetterMethods } from "./utils/request-setters"

type PostRequestModuleConfig = {
  envs: TestResult["envs"]
  testRunStack: TestDescriptor[]
  request: HoppRESTRequest
  response: TestResponse
  cookies: Cookie[] | null
  handleSandboxResults: ({
    envs,
    testRunStack,
    cookies,
  }: {
    envs: TestResult["envs"]
    testRunStack: TestDescriptor[]
    cookies: Cookie[] | null
  }) => void
  onTestPromise?: (promise: Promise<void>) => void
}

type PreRequestModuleConfig = {
  envs: TestResult["envs"]
  request: HoppRESTRequest
  cookies: Cookie[] | null
  handleSandboxResults: ({
    envs,
    request,
    cookies,
  }: {
    envs: TestResult["envs"]
    request: HoppRESTRequest
    cookies: Cookie[] | null
  }) => void
}

type ModuleType = "pre" | "post"
type ModuleConfig = PreRequestModuleConfig | PostRequestModuleConfig

/**
 * Additional results that may be required for hook registration
 */
type HookRegistrationAdditionalResults = {
  getUpdatedRequest: () => HoppRESTRequest
}

/**
 * Type for pre-request script inputs (includes BaseInputs + request setters)
 */
type PreRequestInputs = BaseInputs &
  ReturnType<typeof createRequestSetterMethods>["methods"]

/**
 * Type for post-request script inputs (includes BaseInputs + test/expectation methods)
 */
type PostRequestInputs = BaseInputs &
  ReturnType<typeof createExpectationMethods> &
  ReturnType<typeof createChaiMethods> & {
    preTest: ReturnType<typeof defineSandboxFn>
    postTest: ReturnType<typeof defineSandboxFn>
    setCurrentTest: ReturnType<typeof defineSandboxFn>
    clearCurrentTest: ReturnType<typeof defineSandboxFn>
    getCurrentTest: ReturnType<typeof defineSandboxFn>
    pushExpectResult: ReturnType<typeof defineSandboxFn>
    getResponse: ReturnType<typeof defineSandboxFn>
    responseReason: ReturnType<typeof defineSandboxFn>
    responseDataURI: ReturnType<typeof defineSandboxFn>
    responseJsonp: ReturnType<typeof defineSandboxFn>
  }

/**
 * Helper function to register after-script execution hooks with proper typing
 * Overload for pre-request hooks (requires additionalResults)
 */
function registerAfterScriptExecutionHook(
  ctx: CageModuleCtx,
  type: "pre",
  config: PreRequestModuleConfig,
  baseInputs: ReturnType<typeof createBaseInputs>,
  additionalResults: HookRegistrationAdditionalResults
): void

/**
 * Overload for post-request hooks (no additionalResults needed)
 */
function registerAfterScriptExecutionHook(
  ctx: CageModuleCtx,
  type: "post",
  config: PostRequestModuleConfig,
  baseInputs: ReturnType<typeof createBaseInputs>
): void

/**
 * Registers hook for capturing script results after async operations complete.
 * We wait for keepAlivePromises to resolve before capturing results,
 * ensuring env mutations from async callbacks (like hopp.fetch().then()) are included.
 */
function registerAfterScriptExecutionHook(
  _ctx: CageModuleCtx,
  _type: ModuleType,
  _config: ModuleConfig,
  _baseInputs: ReturnType<typeof createBaseInputs>,
  _additionalResults?: HookRegistrationAdditionalResults
) {
  // No-op: result capture happens after cage.runCode() completes.
}

/**
 * Creates input object for scripting modules with appropriate methods based on type
 * Overloads ensure proper return types for pre vs post request contexts
 */
function createScriptingInputsObj(
  ctx: CageModuleCtx,
  type: "pre",
  config: PreRequestModuleConfig,
  captureGetUpdatedRequest?: (fn: () => HoppRESTRequest) => void
): PreRequestInputs
function createScriptingInputsObj(
  ctx: CageModuleCtx,
  type: "post",
  config: PostRequestModuleConfig,
  captureGetUpdatedRequest?: (fn: () => HoppRESTRequest) => void
): PostRequestInputs
function createScriptingInputsObj(
  ctx: CageModuleCtx,
  type: ModuleType,
  config: ModuleConfig,
  captureGetUpdatedRequest?: (fn: () => HoppRESTRequest) => void
): PreRequestInputs | PostRequestInputs {
  if (type === "pre") {
    const preConfig = config as PreRequestModuleConfig

    // Create request setter methods FIRST for pre-request scripts
    const { methods: requestSetterMethods, getUpdatedRequest } =
      createRequestSetterMethods(ctx, preConfig.request)

    // Capture the getUpdatedRequest function so the caller can use it
    if (captureGetUpdatedRequest) {
      captureGetUpdatedRequest(getUpdatedRequest)
    }

    // Create base inputs with access to updated request
    const baseInputs = createBaseInputs(ctx, {
      envs: config.envs,
      request: config.request,
      cookies: config.cookies,
      getUpdatedRequest, // Pass the updater function for pre-request
    })

    // Register hook with helper function
    registerAfterScriptExecutionHook(ctx, "pre", preConfig, baseInputs, {
      getUpdatedRequest,
    })

    return {
      ...baseInputs,
      ...requestSetterMethods,
    } as PreRequestInputs
  }

  // Create base inputs shared across all namespaces (post-request path)
  const baseInputs = createBaseInputs(ctx, {
    envs: config.envs,
    request: config.request,
    cookies: config.cookies,
  })

  if (type === "post") {
    const postConfig = config as PostRequestModuleConfig

    // Track current executing test
    let currentExecutingTest: TestDescriptor | null = null

    const getCurrentTestContext = (): TestDescriptor | null => {
      return currentExecutingTest
    }

    // Create expectation methods for post-request scripts
    const expectationMethods = createExpectationMethods(
      ctx,
      postConfig.testRunStack,
      getCurrentTestContext // Pass getter for current test context
    )

    // Create Chai methods
    const chaiMethods = createChaiMethods(
      ctx,
      postConfig.testRunStack,
      getCurrentTestContext // Pass getter for current test context
    )

    return {
      ...baseInputs,
      ...expectationMethods,
      ...chaiMethods,

      // Test management methods
      preTest: defineSandboxFn(
        ctx,
        "preTest",
        function preTest(descriptor: unknown) {
          const testDescriptor: TestDescriptor = {
            descriptor: descriptor as string,
            expectResults: [],
            children: [],
          }

          // Add to root.children immediately to preserve registration order.
          postConfig.testRunStack[0].children.push(testDescriptor)

          // Stack tracking is handled by setCurrentTest() in bootstrap code.

          // Return the test descriptor so it can be set as context
          return testDescriptor
        }
      ),
      postTest: defineSandboxFn(ctx, "postTest", function postTest() {
        // Test cleanup handled by clearCurrentTest() in bootstrap.
      }),
      setCurrentTest: defineSandboxFn(
        ctx,
        "setCurrentTest",
        function setCurrentTest(descriptorName: unknown) {
          // Find the test descriptor in the testRunStack by descriptor name
          // This ensures we use the ACTUAL object, not a serialized copy
          const found = postConfig.testRunStack[0].children.find(
            (test) => test.descriptor === descriptorName
          )
          currentExecutingTest = found || null
        }
      ),
      clearCurrentTest: defineSandboxFn(
        ctx,
        "clearCurrentTest",
        function clearCurrentTest() {
          currentExecutingTest = null
        }
      ),
      getCurrentTest: defineSandboxFn(
        ctx,
        "getCurrentTest",
        function getCurrentTest() {
          // Return the descriptor NAME (string) instead of the object
          // This allows QuickJS code to store and pass it back to setCurrentTest()
          return currentExecutingTest ? currentExecutingTest.descriptor : null
        }
      ),
      // Helper to push expectation results directly to the current test
      pushExpectResult: defineSandboxFn(
        ctx,
        "pushExpectResult",
        function pushExpectResult(status: unknown, message: unknown) {
          if (currentExecutingTest) {
            currentExecutingTest.expectResults.push({
              status: status as "pass" | "fail" | "error",
              message: message as string,
            })
          }
        }
      ),
      // Allow bootstrap code to notify when test promises are created
      onTestPromise: postConfig.onTestPromise
        ? defineSandboxFn(
            ctx,
            "onTestPromise",
            function onTestPromise(promise: unknown) {
              if (postConfig.onTestPromise) {
                postConfig.onTestPromise(promise as Promise<void>)
              }
            }
          )
        : undefined,
      getResponse: defineSandboxFn(ctx, "getResponse", function getResponse() {
        return postConfig.response
      }),
      // Response utility methods as cage functions
      responseReason: defineSandboxFn(
        ctx,
        "responseReason",
        function responseReason() {
          return getStatusReason(postConfig.response.status)
        }
      ),
      responseDataURI: defineSandboxFn(
        ctx,
        "responseDataURI",
        function responseDataURI() {
          try {
            const body = postConfig.response.body
            const contentType =
              postConfig.response.headers.find(
                (h) => h.key.toLowerCase() === "content-type"
              )?.value || "application/octet-stream"

            // Convert body to base64 (browser and Node.js compatible)
            let base64Body: string
            const bodyString = typeof body === "string" ? body : String(body)

            // Check if we're in a browser environment (btoa available)
            if (typeof btoa !== "undefined") {
              // Browser environment: use btoa
              // btoa requires binary string, so we need to handle UTF-8 properly
              const utf8Bytes = new TextEncoder().encode(bodyString)
              const binaryString = Array.from(utf8Bytes, (byte) =>
                String.fromCharCode(byte)
              ).join("")
              base64Body = btoa(binaryString)
            } else if (typeof Buffer !== "undefined") {
              // Node.js environment: use Buffer
              base64Body = Buffer.from(bodyString).toString("base64")
            } else {
              throw new Error("No base64 encoding method available")
            }

            return `data:${contentType};base64,${base64Body}`
          } catch (error) {
            throw new Error(`Failed to convert response to data URI: ${error}`)
          }
        }
      ),
      responseJsonp: defineSandboxFn(
        ctx,
        "responseJsonp",
        function responseJsonp(...args: unknown[]) {
          const callbackName = args[0]
          const body = postConfig.response.body
          const text = typeof body === "string" ? body : String(body)

          if (callbackName && typeof callbackName === "string") {
            // Escape special regex characters in callback name
            const escapedName = callbackName.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )
            const regex = new RegExp(
              `^\\s*${escapedName}\\s*\\(([\\s\\S]*)\\)\\s*;?\\s*$`
            )
            const match = text.match(regex)
            if (match && match[1]) {
              return JSON.parse(match[1])
            }
          }

          // Auto-detect callback wrapper
          const autoDetect = text.match(
            /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([\s\S]*)\)\s*;?\s*$/
          )
          if (autoDetect && autoDetect[2]) {
            try {
              return JSON.parse(autoDetect[2])
            } catch {
              // If parsing fails, fall through to plain JSON
            }
          }

          // No JSONP wrapper found, parse as plain JSON
          return JSON.parse(text)
        }
      ),
    } as PostRequestInputs
  }

  // This should never be reached due to the type guards above
  throw new Error(`Invalid module type: ${type}`)
}

/**
 * Creates a scripting module for pre or post request execution
 */
const createScriptingModule = (
  type: ModuleType,
  bootstrapCode: string,
  config: ModuleConfig,
  captureHook?: { capture?: () => void }
) => {
  return defineCageModule((ctx) => {
    // Track test promises for keepAlive (only for post-request scripts)
    const testPromises: Promise<unknown>[] = []
    let resolveKeepAlive: (() => void) | null = null
    let rejectKeepAlive: ((error: Error) => void) | null = null

    // Only register keepAlive for post-request tests; pre-request scripts shouldn't block on this
    let testPromiseKeepAlive: Promise<void> | null = null
    if ((type as ModuleType) === "post") {
      testPromiseKeepAlive = new Promise<void>((resolve, reject) => {
        resolveKeepAlive = resolve
        rejectKeepAlive = reject
      })
      ctx.keepAlivePromises.push(testPromiseKeepAlive)
    }

    // Wrap onTestPromise to track in testPromises array (post-request only)
    const originalOnTestPromise = (config as PostRequestModuleConfig)
      .onTestPromise
    if (originalOnTestPromise) {
      ;(config as PostRequestModuleConfig).onTestPromise = (promise) => {
        testPromises.push(promise)
        originalOnTestPromise(promise)
      }
    }

    const funcHandle = ctx.scope.manage(ctx.vm.evalCode(bootstrapCode)).unwrap()

    // Capture getUpdatedRequest via callback for pre-request scripts
    let getUpdatedRequest: (() => HoppRESTRequest) | undefined = undefined
    // Type assertion needed here because TypeScript can't narrow ModuleType to "pre" | "post"
    // in this generic context. The function overloads ensure type safety at call sites.
    const inputsObj = createScriptingInputsObj(
      ctx,
      type as "pre",
      config as PreRequestModuleConfig,
      (fn) => {
        getUpdatedRequest = fn
      }
    ) as PreRequestInputs | PostRequestInputs

    // Set up capture function to capture results after runCode() completes.
    if (captureHook && type === "pre") {
      const preConfig = config as PreRequestModuleConfig
      const preInputs = inputsObj as PreRequestInputs

      captureHook.capture = () => {
        const capturedEnvs = preInputs.getUpdatedEnvs() || {
          global: [],
          selected: [],
        }
        // Use the getUpdatedRequest from request setters (via createRequestSetterMethods)
        // This returns the mutated request, not the original
        const finalRequest = getUpdatedRequest
          ? getUpdatedRequest()
          : config.request

        preConfig.handleSandboxResults({
          envs: capturedEnvs,
          request: finalRequest,
          cookies: preInputs.getUpdatedCookies() || null,
        })
      }
    } else if (captureHook && type === "post") {
      const postConfig = config as PostRequestModuleConfig
      const postInputs = inputsObj as PostRequestInputs

      captureHook.capture = () => {
        // Deep clone testRunStack to prevent UI reactivity to async mutations
        // Without this, async test callbacks that complete after capture will mutate
        // the same object being displayed in the UI, causing flickering test results

        postConfig.handleSandboxResults({
          envs: postInputs.getUpdatedEnvs() || {
            global: [],
            selected: [],
          },
          testRunStack: cloneDeep(postConfig.testRunStack),
          cookies: postInputs.getUpdatedCookies() || null,
        })
      }
    }

    const sandboxInputsObj = defineSandboxObject(ctx, inputsObj)

    const bootstrapResult = ctx.vm.callFunction(
      funcHandle,
      ctx.vm.undefined,
      sandboxInputsObj
    )

    // Extract the test execution chain promise from the bootstrap function's return value
    let testExecutionChainPromise: any = null
    if (bootstrapResult.error) {
      console.error(
        "[SCRIPTING] Bootstrap function error:",
        ctx.vm.dump(bootstrapResult.error)
      )
      bootstrapResult.error.dispose()
    } else if (bootstrapResult.value) {
      testExecutionChainPromise = bootstrapResult.value
      // Don't dispose the value yet - we need to await it
    }

    // Wait for test execution chain before resolving keepAlive.
    // Ensures QuickJS context stays active for callbacks accessing handles (pm.expect, etc.).
    if ((type as ModuleType) === "post") {
      ctx.afterScriptExecutionHooks.push(async () => {
        try {
          // If we have a test execution chain, await it
          if (testExecutionChainPromise) {
            const resolvedPromise = ctx.vm.resolvePromise(
              testExecutionChainPromise
            )
            testExecutionChainPromise.dispose()

            const awaitResult = await resolvedPromise
            if (awaitResult.error) {
              const errorDump = ctx.vm.dump(awaitResult.error)
              awaitResult.error.dispose()
              // Propagate test execution errors.
              const error = new Error(
                typeof errorDump === "string"
                  ? errorDump
                  : JSON.stringify(errorDump)
              )
              rejectKeepAlive?.(error)
              return
            } else {
              awaitResult.value?.dispose()
            }
          }

          // Also wait for any old-style test promises (for backwards compatibility)
          if (testPromises.length > 0) {
            await Promise.allSettled(testPromises)
          }

          resolveKeepAlive?.()
        } catch (error) {
          rejectKeepAlive?.(
            error instanceof Error ? error : new Error(String(error))
          )
        }
      })
    }
  })
}

export const preRequestModule = (
  config: PreRequestModuleConfig,
  captureHook?: { capture?: () => void }
) => createScriptingModule("pre", preRequestBootstrapCode, config, captureHook)

export const postRequestModule = (
  config: PostRequestModuleConfig,
  captureHook?: { capture?: () => void }
) =>
  createScriptingModule("post", postRequestBootstrapCode, config, captureHook)
