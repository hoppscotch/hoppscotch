import {
  defineCageModule,
  defineSandboxFn,
  defineSandboxObject,
} from "faraday-cage/modules"
import { createExpectation, getSharedMethods } from "~/shared-utils"
import { TestDescriptor, TestResponse, TestResult } from "~/types"

import postRequestBootstrapCode from "../bootstrap-code/post-request?raw"
import preRequestBootstrapCode from "../bootstrap-code/pre-request?raw"

type PwPostRequestModuleConfig = {
  envs: TestResult["envs"]
  testRunStack: TestDescriptor[]
  response: TestResponse
  handleSandboxResults: ({
    envs,
    testRunStack,
  }: {
    envs: TestResult["envs"]
    testRunStack: TestDescriptor[]
  }) => void
}

type PwPreRequestModuleConfig = {
  envs: TestResult["envs"]
  handleSandboxResults: ({ envs }: { envs: TestResult["envs"] }) => void
}

type PwModuleType = "pre" | "post"
type PwModuleConfig = PwPreRequestModuleConfig | PwPostRequestModuleConfig

const createPwInputsObj = (
  ctx: any,
  methods: any,
  type: PwModuleType,
  config: PwModuleConfig
) => {
  const baseInputs = {
    envGet: defineSandboxFn(ctx, "get", (key) => methods.env.get(key)),
    envGetResolve: defineSandboxFn(ctx, "getResolve", (key) =>
      methods.env.getResolve(key)
    ),
    envSet: defineSandboxFn(ctx, "set", (key, value) => {
      return methods.env.set(key, value)
    }),
    envUnset: defineSandboxFn(ctx, "unset", (key) => methods.env.unset(key)),
    envResolve: defineSandboxFn(ctx, "resolve", (key) =>
      methods.env.resolve(key)
    ),
  }

  if (type === "post") {
    const postConfig = config as PwPostRequestModuleConfig
    return {
      ...baseInputs,
      expectToBe: defineSandboxFn(ctx, "toBe", (expectVal, expectedVal) =>
        createExpectation(expectVal, false, postConfig.testRunStack).toBe(
          expectedVal
        )
      ),
      expectToBeLevel2xx: defineSandboxFn(ctx, "toBeLevel2xx", (expectVal) =>
        createExpectation(
          expectVal,
          false,
          postConfig.testRunStack
        ).toBeLevel2xx()
      ),
      expectToBeLevel3xx: defineSandboxFn(ctx, "toBeLevel3xx", (expectVal) =>
        createExpectation(
          expectVal,
          false,
          postConfig.testRunStack
        ).toBeLevel3xx()
      ),
      expectToBeLevel4xx: defineSandboxFn(ctx, "toBeLevel4xx", (expectVal) =>
        createExpectation(
          expectVal,
          false,
          postConfig.testRunStack
        ).toBeLevel4xx()
      ),
      expectToBeLevel5xx: defineSandboxFn(ctx, "toBeLevel5xx", (expectVal) =>
        createExpectation(
          expectVal,
          false,
          postConfig.testRunStack
        ).toBeLevel5xx()
      ),
      expectToBeType: defineSandboxFn(
        ctx,
        "toBeType",
        (expectVal, expectedType, isExpectValDateInstance) => {
          // Supplying `new Date()` in the script gets serialized in the sandbox context
          // Parse the string back to a date instance
          const resolvedExpectVal =
            isExpectValDateInstance && typeof expectVal === "string"
              ? new Date(expectVal)
              : expectVal

          return createExpectation(
            resolvedExpectVal,
            false,
            postConfig.testRunStack
          ).toBeType(expectedType)
        }
      ),
      expectToHaveLength: defineSandboxFn(
        ctx,
        "toHaveLength",
        (expectVal, expectedLength) =>
          createExpectation(
            expectVal,
            false,
            postConfig.testRunStack
          ).toHaveLength(expectedLength)
      ),
      expectToInclude: defineSandboxFn(ctx, "toInclude", (expectVal, needle) =>
        createExpectation(expectVal, false, postConfig.testRunStack).toInclude(
          needle
        )
      ),
      expectNotToBe: defineSandboxFn(ctx, "notToBe", (expectVal, expectedVal) =>
        createExpectation(expectVal, false, postConfig.testRunStack).not.toBe(
          expectedVal
        )
      ),
      expectNotToBeLevel2xx: defineSandboxFn(
        ctx,
        "notToBeLevel2xx",
        (expectVal) =>
          createExpectation(
            expectVal,
            false,
            postConfig.testRunStack
          ).not.toBeLevel2xx()
      ),
      expectNotToBeLevel3xx: defineSandboxFn(
        ctx,
        "notToBeLevel3xx",
        (expectVal) =>
          createExpectation(
            expectVal,
            false,
            postConfig.testRunStack
          ).not.toBeLevel3xx()
      ),
      expectNotToBeLevel4xx: defineSandboxFn(
        ctx,
        "notToBeLevel4xx",
        (expectVal) =>
          createExpectation(
            expectVal,
            false,
            postConfig.testRunStack
          ).not.toBeLevel4xx()
      ),
      expectNotToBeLevel5xx: defineSandboxFn(
        ctx,
        "notToBeLevel5xx",
        (expectVal) =>
          createExpectation(
            expectVal,
            false,
            postConfig.testRunStack
          ).not.toBeLevel5xx()
      ),
      expectNotToBeType: defineSandboxFn(
        ctx,
        "notToBeType",
        (expectVal, expectedType, isExpectValDateInstance) => {
          // Supplying `new Date()` in the script gets serialized in the sandbox context
          // Parse the string back to a date instance
          const resolvedExpectVal =
            isExpectValDateInstance && typeof expectVal === "string"
              ? new Date(expectVal)
              : expectVal

          return createExpectation(
            resolvedExpectVal,
            false,
            postConfig.testRunStack
          ).not.toBeType(expectedType)
        }
      ),
      expectNotToHaveLength: defineSandboxFn(
        ctx,
        "notToHaveLength",
        (expectVal, expectedLength) =>
          createExpectation(
            expectVal,
            false,
            postConfig.testRunStack
          ).not.toHaveLength(expectedLength)
      ),
      expectNotToInclude: defineSandboxFn(
        ctx,
        "notToInclude",
        (expectVal, needle) =>
          createExpectation(
            expectVal,
            false,
            postConfig.testRunStack
          ).not.toInclude(needle)
      ),
      preTest: defineSandboxFn(ctx, "preTest", (descriptor: any) => {
        postConfig.testRunStack.push({
          descriptor,
          expectResults: [],
          children: [],
        })
      }),
      postTest: defineSandboxFn(ctx, "postTest", () => {
        const child = postConfig.testRunStack.pop() as TestDescriptor
        postConfig.testRunStack[
          postConfig.testRunStack.length - 1
        ].children.push(child)
      }),
      getResponse: defineSandboxFn(
        ctx,
        "getResponse",
        () => postConfig.response
      ),
    }
  }

  return baseInputs
}

const createPwModule = (
  type: PwModuleType,
  bootstrapCode: string,
  config: PwModuleConfig
) => {
  return defineCageModule((ctx) => {
    const funcHandle = ctx.scope.manage(ctx.vm.evalCode(bootstrapCode)).unwrap()

    const { methods, updatedEnvs } = getSharedMethods(config.envs)

    const inputsObj = defineSandboxObject(
      ctx,
      createPwInputsObj(ctx, methods, type, config)
    )

    ctx.vm.callFunction(funcHandle, ctx.vm.undefined, inputsObj)

    ctx.afterScriptExecutionHooks.push(() => {
      if (type === "post") {
        const postConfig = config as PwPostRequestModuleConfig
        postConfig.handleSandboxResults({
          envs: updatedEnvs,
          testRunStack: postConfig.testRunStack,
        })
      } else {
        const preConfig = config as PwPreRequestModuleConfig
        preConfig.handleSandboxResults({
          envs: updatedEnvs,
        })
      }
    })
  })
}

export const pwPreRequestModule = (config: PwPreRequestModuleConfig) =>
  createPwModule("pre", preRequestBootstrapCode, config)

export const pwPostRequestModule = (config: PwPostRequestModuleConfig) =>
  createPwModule("post", postRequestBootstrapCode, config)
