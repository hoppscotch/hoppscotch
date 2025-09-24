import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import {
  CageModuleCtx,
  defineCageModule,
  defineSandboxFn,
  defineSandboxObject,
} from "faraday-cage/modules"

import { TestDescriptor, TestResponse, TestResult } from "~/types"
import postRequestBootstrapCode from "../bootstrap-code/post-request?raw"
import preRequestBootstrapCode from "../bootstrap-code/pre-request?raw"
import { createBaseInputs } from "./utils/base-inputs"
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
 * Implementation of the hook registration function
 */
function registerAfterScriptExecutionHook(
  ctx: CageModuleCtx,
  type: ModuleType,
  config: ModuleConfig,
  baseInputs: ReturnType<typeof createBaseInputs>,
  additionalResults?: HookRegistrationAdditionalResults
) {
  if (type === "pre") {
    const preConfig = config as PreRequestModuleConfig
    const getUpdatedRequest = additionalResults?.getUpdatedRequest

    if (!getUpdatedRequest) {
      throw new Error(
        "getUpdatedRequest is required for pre-request hook registration"
      )
    }

    ctx.afterScriptExecutionHooks.push(() => {
      preConfig.handleSandboxResults({
        envs: baseInputs.getUpdatedEnvs(),
        request: getUpdatedRequest(),
        cookies: baseInputs.getUpdatedCookies(),
      })
    })
  } else if (type === "post") {
    const postConfig = config as PostRequestModuleConfig

    ctx.afterScriptExecutionHooks.push(() => {
      postConfig.handleSandboxResults({
        envs: baseInputs.getUpdatedEnvs(),
        testRunStack: postConfig.testRunStack,
        cookies: baseInputs.getUpdatedCookies(),
      })
    })
  }
}

/**
 * Creates input object for scripting modules with appropriate methods based on type
 */
const createScriptingInputsObj = (
  ctx: CageModuleCtx,
  type: ModuleType,
  config: ModuleConfig
) => {
  // Create base inputs shared across all namespaces
  const baseInputs = createBaseInputs(ctx, {
    envs: config.envs,
    request: config.request,
    cookies: config.cookies,
  })

  if (type === "pre") {
    const preConfig = config as PreRequestModuleConfig

    // Create request setter methods for pre-request scripts
    const { methods: requestSetterMethods, getUpdatedRequest } =
      createRequestSetterMethods(ctx, preConfig.request)

    // Register hook with helper function
    registerAfterScriptExecutionHook(ctx, "pre", preConfig, baseInputs, {
      getUpdatedRequest,
    })

    return {
      ...baseInputs,
      ...requestSetterMethods,
    }
  }

  if (type === "post") {
    const postConfig = config as PostRequestModuleConfig

    // Create expectation methods for post-request scripts
    const expectationMethods = createExpectationMethods(
      ctx,
      postConfig.testRunStack
    )

    // Register hook with helper function
    registerAfterScriptExecutionHook(ctx, "post", postConfig, baseInputs)

    return {
      ...baseInputs,
      ...expectationMethods,

      // Test management methods
      preTest: defineSandboxFn(
        ctx,
        "preTest",
        function preTest(descriptor: any) {
          postConfig.testRunStack.push({
            descriptor,
            expectResults: [],
            children: [],
          })
        }
      ),
      postTest: defineSandboxFn(ctx, "postTest", function postTest() {
        const child = postConfig.testRunStack.pop() as TestDescriptor
        postConfig.testRunStack[
          postConfig.testRunStack.length - 1
        ].children.push(child)
      }),
      getResponse: defineSandboxFn(ctx, "getResponse", function getResponse() {
        return postConfig.response
      }),
    }
  }

  return baseInputs
}

/**
 * Creates a scripting module for pre or post request execution
 */
const createScriptingModule = (
  type: ModuleType,
  bootstrapCode: string,
  config: ModuleConfig
) => {
  return defineCageModule((ctx) => {
    const funcHandle = ctx.scope.manage(ctx.vm.evalCode(bootstrapCode)).unwrap()

    const inputsObj = defineSandboxObject(
      ctx,
      createScriptingInputsObj(ctx, type, config)
    )

    ctx.vm.callFunction(funcHandle, ctx.vm.undefined, inputsObj)
  })
}

export const preRequestModule = (config: PreRequestModuleConfig) =>
  createScriptingModule("pre", preRequestBootstrapCode, config)

export const postRequestModule = (config: PostRequestModuleConfig) =>
  createScriptingModule("post", postRequestBootstrapCode, config)
