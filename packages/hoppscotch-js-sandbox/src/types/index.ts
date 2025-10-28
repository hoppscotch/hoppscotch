import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import { ConsoleEntry, defineSandboxFn } from "faraday-cage/modules"

import type { EnvAPIOptions } from "~/utils/shared"

// Infer the return type of defineSandboxFn from faraday-cage
type SandboxFunction = ReturnType<typeof defineSandboxFn>

/**
 * Type alias for values that cross the QuickJS sandbox boundary.
 *
 * Values passed between the host environment and the QuickJS sandbox lose their
 * TypeScript type information during serialization. This type alias serves as
 * a documented alternative to raw `any`, making it explicit that these values:
 *
 * - Come from or go to the sandbox (pre-request/post-request scripts)
 * - Have been serialized and may not preserve complex types
 * - Require runtime validation when type safety is needed
 *
 * Use this type for:
 * - Function parameters that accept user script values
 * - Return values sent back to the sandbox
 * - PM namespace compatibility (preserves non-string types like arrays, objects)
 *
 * Supported types for environment variable values:
 * - Primitives: string, number, boolean, null, undefined
 * - Objects: plain objects, arrays (recursively containing these types)
 * - Unsupported: Functions, Symbols, and other non-serializable types
 *
 * Note: Typed as `any` because this type is used in multiple contexts:
 * 1. Environment variable storage (supports primitives, objects, arrays)
 * 2. Function parameters from user scripts (requires runtime validation)
 * 3. Internal object properties (may include QuickJS handles)
 *
 * @example
 * ```typescript
 * // Function accepting values from user scripts
 * const envSetAny = (key: SandboxValue, value: SandboxValue) => {
 *   // Runtime validation required since type is `any`
 *   if (typeof key !== "string") throw new Error("Expected string key")
 *   // ... handle value
 * }
 * ```
 */
export type SandboxValue = any

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

/**
 * Internal representation of environment variables within the sandbox runtime.
 *
 * Values can be complex types (arrays, objects) while executing scripts.
 * This type is exported for internal use within js-sandbox but should NOT
 * be used by consuming packages - use `EnvironmentVariable` instead.
 *
 * @internal
 */
export type SandboxEnvironmentVariable = {
  key: string
  currentValue: SandboxValue // Can be arrays, objects, primitives
  initialValue: SandboxValue
  secret: boolean
}

/**
 * Internal representation of the envs structure during sandbox execution.
 * This is what's used internally, before serialization to TestResult["envs"].
 *
 * At runtime, environment variables are stored with SandboxValue types to support
 * PM namespace compatibility (arrays, objects, etc.). The serialization to strings
 * happens only when getUpdatedEnvs() is called at the end of script execution.
 *
 * Note: This type is structurally compatible with TestResult["envs"] at runtime,
 * but TypeScript sees them as different types due to the SandboxValue vs string
 * difference. Use type assertions when converting between them.
 *
 * @internal
 */
export type SandboxEnvs = {
  global: SandboxEnvironmentVariable[]
  selected: SandboxEnvironmentVariable[]
}

/**
 * External representation of environment variables at the API boundary.
 *
 * All values are serialized to strings when crossing the sandbox boundary
 * via getUpdatedEnvs() which calls JSON.stringify() on complex types.
 *
 * This is what consuming packages (hoppscotch-common, cli, etc.) receive.
 */
export type EnvironmentVariable = {
  key: string
  currentValue: string // Always string after serialization
  initialValue: string // Always string after serialization
  secret: boolean
}

/**
 * Defines the result of a test script execution.
 *
 * Note: envs contain EnvironmentVariable (strings) not SandboxValue,
 * because values are serialized when leaving the sandbox.
 */
export type TestResult = {
  tests: TestDescriptor[]
  envs: {
    global: EnvironmentVariable[]
    selected: EnvironmentVariable[]
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
  toBe(expectedVal: SandboxValue): void
  toBeLevel2xx(): void
  toBeLevel3xx(): void
  toBeLevel4xx(): void
  toBeLevel5xx(): void
  toBeType(expectedType: SandboxValue): void
  toHaveLength(expectedLength: SandboxValue): void
  toInclude(needle: SandboxValue): void
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
  // Returns serialized env vars (SandboxValue -> string conversion happens here)
  getUpdatedEnvs: () => TestResult["envs"]
  getUpdatedCookies: () => Cookie[] | null
  [key: string]: SandboxValue // Index signature for dynamic namespace properties
}
