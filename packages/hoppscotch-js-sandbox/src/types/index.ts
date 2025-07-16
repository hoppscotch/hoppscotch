import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import { ConsoleEntry, defineSandboxFn } from "faraday-cage/modules"

import type { EnvAPIOptions } from "~/utils/shared"

// Infer the return type of defineSandboxFn from faraday-cage
type SandboxFunction = ReturnType<typeof defineSandboxFn>

/**
 * The response object structure exposed to the test script
 */
export type TestResponse = {
  /** Status Code of the response */
  status: number

  /** Status text of the response (e.g., "OK", "Not Found", "Internal Server Error") */
  statusText: string

  /** Time taken for the request to complete in milliseconds */
  responseTime: number

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
export type ExpectResult = {
  status: "pass" | "fail" | "error"
  message: string
} // The expectation failed (fail) or errored (error)

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

// Representation of a transformed state for environment variables in the sandbox
type TransformedEnvironmentVariable = {
  key: string
  currentValue: string
  initialValue: string
  secret: boolean
}

/**
 * Defines the result of a test script execution
 */

export type TestResult = {
  tests: TestDescriptor[]
  envs: {
    global: TransformedEnvironmentVariable[]
    selected: TransformedEnvironmentVariable[]
  }
}

export type GlobalEnvItem = TestResult["envs"]["global"][number]
export type SelectedEnvItem = TestResult["envs"]["selected"][number]

export type SandboxTestResult = TestResult & { tests: TestDescriptor } & {
  consoleEntries?: ConsoleEntry[]
  updatedCookies: Cookie[] | null
}

export type SandboxPreRequestResult = {
  updatedEnvs: TestResult["envs"]
  consoleEntries?: ConsoleEntry[]
  updatedRequest?: HoppRESTRequest
  updatedCookies: Cookie[] | null
}

export interface Expectation {
  toBe(expectedVal: any): void
  toBeLevel2xx(): void
  toBeLevel3xx(): void
  toBeLevel4xx(): void
  toBeLevel5xx(): void
  toBeType(expectedType: any): void
  toHaveLength(expectedLength: any): void
  toInclude(needle: any): void
  readonly not: Expectation
}

export type RunPreRequestScriptOptions =
  | {
      envs: TestResult["envs"]
      request: HoppRESTRequest
      cookies: Cookie[] | null // Exclusive to the Desktop App
      experimentalScriptingSandbox: true
    }
  | {
      envs: TestResult["envs"]
      experimentalScriptingSandbox?: false
    }

export type RunPostRequestScriptOptions =
  | {
      envs: TestResult["envs"]
      request: HoppRESTRequest
      response: TestResponse
      cookies: Cookie[] | null // Exclusive to the Desktop App
      experimentalScriptingSandbox: true
    }
  | {
      envs: TestResult["envs"]
      response: TestResponse
      experimentalScriptingSandbox?: false
    }

/**
 * Request properties structure exposed to sandbox
 */
export type RequestProps = {
  readonly url: string
  readonly method: string
  readonly params: HoppRESTRequest["params"]
  readonly headers: HoppRESTRequest["headers"]
  readonly body: HoppRESTRequest["body"]
  readonly auth: HoppRESTRequest["auth"]
  readonly requestVariables: HoppRESTRequest["requestVariables"]
}

/**
 * Environment methods structure returned by getSharedEnvMethods
 */
export type EnvMethods = {
  pw: {
    get: (key: string, options?: EnvAPIOptions) => string | null | undefined
    getResolve: (
      key: string,
      options?: EnvAPIOptions
    ) => string | null | undefined
    set: (key: string, value: string, options?: EnvAPIOptions) => void
    unset: (key: string, options?: EnvAPIOptions) => void
    resolve: (key: string) => string
  }
  hopp: {
    set: (key: string, value: string, options?: EnvAPIOptions) => void
    delete: (key: string, options?: EnvAPIOptions) => void
    reset: (key: string, options?: EnvAPIOptions) => void
    getInitialRaw: (key: string, options?: EnvAPIOptions) => string | null
    setInitial: (key: string, value: string, options?: EnvAPIOptions) => void
  }
}

/**
 * Return type for createHoppNamespaceMethods function
 */
export interface HoppNamespaceMethods {
  envDelete: SandboxFunction
  envReset: SandboxFunction
  envGetInitialRaw: SandboxFunction
  envSetInitial: SandboxFunction
  getRequestProps: SandboxFunction
}

/**
 * Return type for createPwNamespaceMethods function
 */
export interface PwNamespaceMethods {
  envGet: SandboxFunction
  envGetResolve: SandboxFunction
  envSet: SandboxFunction
  envUnset: SandboxFunction
  envResolve: SandboxFunction
  getRequestVariable: SandboxFunction
}

/**
 * Return type for createPmNamespaceMethods function
 */
export interface PmNamespaceMethods {
  pmInfoRequestName: SandboxFunction
  pmInfoRequestId: SandboxFunction
}

/**
 * Return type for createExpectationMethods function
 */
export interface ExpectationMethods {
  expectToBe: SandboxFunction
  expectToBeLevel2xx: SandboxFunction
  expectToBeLevel3xx: SandboxFunction
  expectToBeLevel4xx: SandboxFunction
  expectToBeLevel5xx: SandboxFunction
  expectToBeType: SandboxFunction
  expectToHaveLength: SandboxFunction
  expectToInclude: SandboxFunction
  expectNotToBe: SandboxFunction
  expectNotToBeLevel2xx: SandboxFunction
  expectNotToBeLevel3xx: SandboxFunction
  expectNotToBeLevel4xx: SandboxFunction
  expectNotToBeLevel5xx: SandboxFunction
  expectNotToBeType: SandboxFunction
  expectNotToHaveLength: SandboxFunction
  expectNotToInclude: SandboxFunction
}

/**
 * Return type for createRequestSetterMethods function
 */
export interface RequestSetterMethodsResult {
  methods: {
    setRequestUrl: SandboxFunction
    setRequestMethod: SandboxFunction
    setRequestHeader: SandboxFunction
    setRequestHeaders: SandboxFunction
    setRequestParam: SandboxFunction
    setRequestParams: SandboxFunction
    removeRequestHeader: SandboxFunction
    removeRequestParam: SandboxFunction
    setRequestBody: SandboxFunction
    setRequestAuth: SandboxFunction
    setRequestVariable: SandboxFunction
  }
  getUpdatedRequest: () => HoppRESTRequest
}

/**
 * Return type for createBaseInputs function
 */
export interface BaseInputs
  extends PwNamespaceMethods,
    HoppNamespaceMethods,
    PmNamespaceMethods {
  cookieGet: SandboxFunction
  cookieSet: SandboxFunction
  cookieHas: SandboxFunction
  cookieGetAll: SandboxFunction
  cookieDelete: SandboxFunction
  cookieClear: SandboxFunction
  getUpdatedEnvs: () => any
  getUpdatedCookies: () => Cookie[] | null
  [key: string]: any
}
