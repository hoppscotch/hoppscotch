import { identity } from "fp-ts/function"
import { QuickJSHandle, QuickJSContext } from "quickjs-emscripten"
import { APIDirEntry } from "./apiManager"
import { PreRequestScriptReport } from "./preRequest"
import { TestScriptReport } from "./test-runner"

export type PreRequestScriptNamespaces = "artifact" | "env"

export type TestScriptNamespaces = "env" | "test" | "expect" | "response"

export type APINamespaces = PreRequestScriptNamespaces | TestScriptNamespaces

/**
 * Defines what should be returned on a `defineAPI` block
 */
type APIMeta<Exposed> = {
  rootHandle: QuickJSHandle
  exposes: Exposed
  childAPIs: APIDirEntry<string, unknown>[]
}

/**
 * Just a collection of information defining an API
 */
export type APIDefinition<ID extends string, Exposed> = {
  id: ID
  creationFunc: (vm: QuickJSContext) => APIMeta<Exposed>
}

/**
 * Defines the implementation of an API
 * @param id The unique ID of the API
 * @param func The implementation function
 * @returns The API definition object
 */
export const defineAPI = <ID extends string, Exposed>(
  id: ID,
  func: APIDefinition<ID, Exposed>["creationFunc"]
): APIDefinition<ID, Exposed> => ({ id, creationFunc: func })

/* These functions rely or setup the api instance initalization handling */

/**
 * An intermediate representation of an API that is being initialized
 */
type APIInit<Exposed> = {
  creationFunc: (vm: QuickJSContext) => APIMeta<Exposed>
  onPreRequestScriptComplete: (
    report: PreRequestScriptReport
  ) => PreRequestScriptReport
  onTestScriptComplete: (report: TestScriptReport) => TestScriptReport
}

/**
 * Final representation of an API which is currently active and installed
 */
export type APIInstance<ID extends string, Exposed> = APIInit<Exposed> & {
  id: ID
  rootHandle: QuickJSHandle
  exposes: Exposed
  childAPIs: APIDirEntry<string, unknown>[]
}

/**
 * A temporary variable to store the currently initializing API
 */
let currentInstance: APIInit<unknown> | null = null

/**
 * Initalizes a single API instance
 * @param vm A QJS context
 * @returns
 */
export const initializeAPI =
  (vm: QuickJSContext) =>
  <ID extends string, Exposed>(
    api: APIDefinition<ID, Exposed>
  ): APIInstance<ID, Exposed> => {
    // Initial State
    currentInstance = {
      creationFunc: api.creationFunc,
      onPreRequestScriptComplete: identity,
      onTestScriptComplete: identity,
    }

    const returnValue = api.creationFunc(vm)

    // Final State
    const result: APIInstance<ID, Exposed> = {
      ...(currentInstance as APIInit<Exposed>), // Guaranteed because of the function
      id: api.id,
      exposes: returnValue.exposes,
      rootHandle: returnValue.rootHandle,
      childAPIs: returnValue.childAPIs,
    }

    currentInstance = null

    return result
  }

/**
 * Defines the function to be called when the pre-request script is complete
 * @param func The function which takes in the report and spits a report with the updates relevant to the API
 */
export const onPreRequestScriptComplete = (
  func: (report: PreRequestScriptReport) => PreRequestScriptReport
) => {
  if (!currentInstance) {
    throw new Error(
      "Cannot use 'onPreRequestScriptComplete' outside a defineAPI block"
    )
  }

  currentInstance.onPreRequestScriptComplete = func
}

/**
 * Defines the function to be called when the test script is complete
 * @param func The function which takes in the report and spits a report with the updates relevant to the API
 */
export const onTestScriptComplete = (
  func: (report: TestScriptReport) => TestScriptReport
) => {
  if (!currentInstance) {
    throw new Error(
      "Cannot use 'onTestScriptComplete' outside a defineAPI block"
    )
  }

  currentInstance.onTestScriptComplete = func
}
