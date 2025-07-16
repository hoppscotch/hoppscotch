import {
  defineCageModule,
  defineSandboxFn,
  defineSandboxObject,
} from "faraday-cage/modules"
import { TestDescriptor, TestResponse, TestResult } from "~/types"
import {
  createExpectation,
  getSharedCookieMethods,
  getSharedEnvMethods,
  getSharedRequestProps,
} from "~/utils/shared"

import {
  Cookie,
  HoppRESTAuth,
  HoppRESTHeaders,
  HoppRESTParams,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { getRequestSetterMethods } from "~/utils/pre-request"
import postRequestBootstrapCode from "../bootstrap-code/post-request?raw"
import preRequestBootstrapCode from "../bootstrap-code/pre-request?raw"

type PwPostRequestModuleConfig = {
  envs: TestResult["envs"]
  testRunStack: TestDescriptor[]
  request: HoppRESTRequest
  response: TestResponse
  cookies?: Cookie[]
  handleSandboxResults: ({
    envs,
    testRunStack,
    cookies,
  }: {
    envs: TestResult["envs"]
    testRunStack: TestDescriptor[]
    cookies: Cookie[]
  }) => void
}

type PwPreRequestModuleConfig = {
  envs: TestResult["envs"]
  request: HoppRESTRequest
  cookies?: Cookie[]
  handleSandboxResults: ({
    envs,
    request,
    cookies,
  }: {
    envs: TestResult["envs"]
    request: HoppRESTRequest
    cookies: Cookie[]
  }) => void
}

type PwModuleType = "pre" | "post"
type PwModuleConfig = PwPreRequestModuleConfig | PwPostRequestModuleConfig

const createPwInputsObj = (
  ctx: any,
  type: PwModuleType,
  config: PwModuleConfig,
) => {
  // Compile methods to manipulate environment variables scoped under both `hopp` and `pw` namespaces
  // TODO: Remove type assertions when `getSharedEnvMethods` is properly typed
  const { methods: envMethods, updatedEnvs } = getSharedEnvMethods(
    config.envs,
    true,
  ) as { methods: any; updatedEnvs: TestResult["envs"] }

  // TODO: Remove type assertions when `getSharedCookieMethods` is properly typed
  const { methods: cookieMethods, getUpdatedCookies } = getSharedCookieMethods(
    config.cookies,
  ) as { methods: any; getUpdatedCookies: () => Cookie[] }

  // TODO: Represent via shared PW module config
  const requestProps = getSharedRequestProps(config.request)

  const requestGetterProps = {
    get url() {
      return requestProps.url
    },
    get method() {
      return requestProps.method
    },
    get params() {
      return requestProps.params
    },
    get headers() {
      return requestProps.headers
    },
    get body() {
      return requestProps.body
    },
    get auth() {
      return requestProps.auth
    },
  }

  // Cookie accessors
  const cookieProps = {
    cookieGet: defineSandboxFn(ctx, "cookieGet", (domain, name) => {
      return cookieMethods.get(domain, name) || null
    }),
    cookieSet: defineSandboxFn(ctx, "cookieSet", (domain, cookie) => {
      return cookieMethods.set(domain, cookie)
    }),
    cookieHas: defineSandboxFn(ctx, "cookieHas", (domain, name) => {
      return cookieMethods.has(domain, name)
    }),
    cookieGetAll: defineSandboxFn(ctx, "cookieGetAll", (domain) => {
      return cookieMethods.getAll(domain)
    }),
    cookieDelete: defineSandboxFn(ctx, "cookieDelete", (domain, name) => {
      return cookieMethods.delete(domain, name)
    }),
    cookieClear: defineSandboxFn(ctx, "cookieClear", (domain) => {
      return cookieMethods.clear(domain)
    }),
  }

  const baseInputs = {
    // `pw` namespace methods
    envGet: defineSandboxFn(ctx, "envGet", function envGet(key, options) {
      return envMethods.pw.get(key, options)
    }),
    envGetResolve: defineSandboxFn(
      ctx,
      "envGetResolve",
      function envGetResolve(key, options) {
        return envMethods.pw.getResolve(key, options)
      },
    ),
    envSet: defineSandboxFn(
      ctx,
      "envSet",
      function envSet(key, value, options) {
        return envMethods.pw.set(key, value, options)
      },
    ),
    envUnset: defineSandboxFn(ctx, "envUnset", function envUnset(key, options) {
      return envMethods.pw.unset(key, options)
    }),
    envResolve: defineSandboxFn(ctx, "envResolve", function envResolve(key) {
      return envMethods.pw.resolve(key)
    }),

    // `hopp` namespace methods
    envDelete: defineSandboxFn(
      ctx,
      "envDelete",
      function envDelete(key, options) {
        return envMethods.hopp.delete(key, options)
      },
    ),
    envReset: defineSandboxFn(ctx, "envReset", function envReset(key, options) {
      return envMethods.hopp.reset(key, options)
    }),
    envGetInitialRaw: defineSandboxFn(
      ctx,
      "envGetInitialRaw",
      function envGetInitialRaw(key, options) {
        return envMethods.hopp.getInitialRaw(key, options)
      },
    ),
    envSetInitial: defineSandboxFn(
      ctx,
      "envSetInitial",
      function envSetInitial(key, value, options) {
        return envMethods.hopp.setInitial(key, value, options)
      },
    ),

    // Request getter props
    getRequestProps: defineSandboxFn(
      ctx,
      "getRequestProps",
      () => requestGetterProps,
    ),

    getRequestVariable: defineSandboxFn(ctx, "getRequestVariable", (key) => {
      const reqVarEntry = requestProps.requestVariables.find(
        (reqVar) => reqVar.key === key,
      )
      return reqVarEntry ? reqVarEntry.value : null
    }),

    ...cookieProps,
  }

  if (type === "pre") {
    const preConfig = config as PwPreRequestModuleConfig

    const { methods: requestMethods, updatedRequest } = getRequestSetterMethods(
      preConfig.request,
    )

    ctx.afterScriptExecutionHooks.push(() => {
      if (type === "pre") {
        const preConfig = config as PwPreRequestModuleConfig
        preConfig.handleSandboxResults({
          envs: updatedEnvs,
          request: updatedRequest,
          cookies: getUpdatedCookies(),
        })
      }
    })

    return {
      ...baseInputs,

      // Request setter methods
      setRequestUrl: defineSandboxFn(ctx, "setRequestUrl", (url) => {
        requestMethods.setUrl(url as string)
      }),
      setRequestMethod: defineSandboxFn(ctx, "setRequestMethod", (method) => {
        requestMethods.setMethod(method as string)
      }),
      setRequestHeader: defineSandboxFn(
        ctx,
        "setRequestHeader",
        (name, value) => {
          requestMethods.setHeader(name as string, value as string)
        },
      ),
      setRequestHeaders: defineSandboxFn(
        ctx,
        "setRequestHeaders",
        (headers) => {
          requestMethods.setHeaders(headers as HoppRESTHeaders)
        },
      ),
      removeRequestHeader: defineSandboxFn(
        ctx,
        "removeRequestHeader",
        (key) => {
          requestMethods.removeHeader(key as string)
        },
      ),
      setRequestParam: defineSandboxFn(
        ctx,
        "setRequestParam",
        (name, value) => {
          requestMethods.setParam(name as string, value as string)
        },
      ),
      setRequestParams: defineSandboxFn(ctx, "setRequestParams", (params) => {
        requestMethods.setParams(params as HoppRESTParams)
      }),
      removeRequestParam: defineSandboxFn(ctx, "removeRequestParam", (key) => {
        requestMethods.removeParam(key as string)
      }),
      setRequestBody: defineSandboxFn(ctx, "setRequestBody", (body) => {
        requestMethods.setBody(body as HoppRESTReqBody)
      }),
      setRequestAuth: defineSandboxFn(ctx, "setRequestAuth", (auth) => {
        requestMethods.setAuth(auth as HoppRESTAuth)
      }),

      setRequestVariable: defineSandboxFn(
        ctx,
        "setRequestVariable",
        (key, value) => {
          requestMethods.setRequestVariable(key as string, value as string)
        },
      ),
    }
  }

  if (type === "post") {
    const postConfig = config as PwPostRequestModuleConfig

    const createExpect = (expectVal: any) =>
      createExpectation(expectVal, false, postConfig.testRunStack)

    ctx.afterScriptExecutionHooks.push(() => {
      if (type === "post") {
        const postConfig = config as PwPostRequestModuleConfig
        postConfig.handleSandboxResults({
          envs: updatedEnvs,
          testRunStack: postConfig.testRunStack,
          cookies: getUpdatedCookies(),
        })
      }
    })

    return {
      ...baseInputs,

      expectToBe: defineSandboxFn(
        ctx,
        "expectToBe",
        function expectToBe(expectVal, expectedVal) {
          return createExpect(expectVal).toBe(expectedVal)
        },
      ),
      expectToBeLevel2xx: defineSandboxFn(
        ctx,
        "expectToBeLevel2xx",
        function expectToBeLevel2xx(expectVal) {
          return createExpect(expectVal).toBeLevel2xx()
        },
      ),
      expectToBeLevel3xx: defineSandboxFn(
        ctx,
        "expectToBeLevel3xx",
        function expectToBeLevel3xx(expectVal) {
          return createExpect(expectVal).toBeLevel3xx()
        },
      ),
      expectToBeLevel4xx: defineSandboxFn(
        ctx,
        "expectToBeLevel4xx",
        function expectToBeLevel4xx(expectVal) {
          return createExpect(expectVal).toBeLevel4xx()
        },
      ),
      expectToBeLevel5xx: defineSandboxFn(
        ctx,
        "expectToBeLevel5xx",
        function expectToBeLevel5xx(expectVal) {
          return createExpect(expectVal).toBeLevel5xx()
        },
      ),
      expectToBeType: defineSandboxFn(
        ctx,
        "expectToBeType",
        function expectToBeType(expectVal, expectedType, isDate) {
          const resolved =
            isDate && typeof expectVal === "string"
              ? new Date(expectVal)
              : expectVal
          return createExpectation(
            resolved,
            false,
            postConfig.testRunStack,
          ).toBeType(expectedType)
        },
      ),
      expectToHaveLength: defineSandboxFn(
        ctx,
        "expectToHaveLength",
        function expectToHaveLength(expectVal, expectedLength) {
          return createExpect(expectVal).toHaveLength(expectedLength)
        },
      ),
      expectToInclude: defineSandboxFn(
        ctx,
        "expectToInclude",
        function expectToInclude(expectVal, needle) {
          return createExpect(expectVal).toInclude(needle)
        },
      ),

      // Negative expectations
      expectNotToBe: defineSandboxFn(
        ctx,
        "expectNotToBe",
        function expectNotToBe(expectVal, expectedVal) {
          return createExpect(expectVal).not.toBe(expectedVal)
        },
      ),
      expectNotToBeLevel2xx: defineSandboxFn(
        ctx,
        "expectNotToBeLevel2xx",
        function expectNotToBeLevel2xx(expectVal) {
          return createExpect(expectVal).not.toBeLevel2xx()
        },
      ),
      expectNotToBeLevel3xx: defineSandboxFn(
        ctx,
        "expectNotToBeLevel3xx",
        function expectNotToBeLevel3xx(expectVal) {
          return createExpect(expectVal).not.toBeLevel3xx()
        },
      ),
      expectNotToBeLevel4xx: defineSandboxFn(
        ctx,
        "expectNotToBeLevel4xx",
        function expectNotToBeLevel4xx(expectVal) {
          return createExpect(expectVal).not.toBeLevel4xx()
        },
      ),
      expectNotToBeLevel5xx: defineSandboxFn(
        ctx,
        "expectNotToBeLevel5xx",
        function expectNotToBeLevel5xx(expectVal) {
          return createExpect(expectVal).not.toBeLevel5xx()
        },
      ),
      expectNotToBeType: defineSandboxFn(
        ctx,
        "expectNotToBeType",
        function expectNotToBeType(expectVal, expectedType, isDate) {
          const resolved =
            isDate && typeof expectVal === "string"
              ? new Date(expectVal)
              : expectVal
          return createExpectation(
            resolved,
            false,
            postConfig.testRunStack,
          ).not.toBeType(expectedType)
        },
      ),
      expectNotToHaveLength: defineSandboxFn(
        ctx,
        "expectNotToHaveLength",
        function expectNotToHaveLength(expectVal, expectedLength) {
          return createExpect(expectVal).not.toHaveLength(expectedLength)
        },
      ),
      expectNotToInclude: defineSandboxFn(
        ctx,
        "expectNotToInclude",
        function expectNotToInclude(expectVal, needle) {
          return createExpect(expectVal).not.toInclude(needle)
        },
      ),

      preTest: defineSandboxFn(
        ctx,
        "preTest",
        function preTest(descriptor: any) {
          postConfig.testRunStack.push({
            descriptor,
            expectResults: [],
            children: [],
          })
        },
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

const createPwModule = (
  type: PwModuleType,
  bootstrapCode: string,
  config: PwModuleConfig,
) => {
  return defineCageModule((ctx) => {
    const funcHandle = ctx.scope.manage(ctx.vm.evalCode(bootstrapCode)).unwrap()

    const inputsObj = defineSandboxObject(
      ctx,
      createPwInputsObj(ctx, type, config),
    )

    ctx.vm.callFunction(funcHandle, ctx.vm.undefined, inputsObj)
  })
}

export const pwPreRequestModule = (config: PwPreRequestModuleConfig) =>
  createPwModule("pre", preRequestBootstrapCode, config)

export const pwPostRequestModule = (config: PwPostRequestModuleConfig) =>
  createPwModule("post", postRequestBootstrapCode, config)
