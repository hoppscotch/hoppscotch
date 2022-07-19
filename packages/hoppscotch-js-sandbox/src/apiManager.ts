import { QuickJSContext, QuickJSHandle } from "quickjs-emscripten"
import { ADT, match } from "ts-adt"
import ArtifactAPI from "./apis/artifact"
import EnvAPI from "./apis/env"
import TestAPI from "./apis/test"
import { flow, identity, pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import * as Tu from "fp-ts/Tuple"
import { APIDefinition, APIInstance, initializeAPI } from "./api"
import {
  getObjectKeysFromHandle,
  throwErr,
  unsafeCast,
  unsafeEffect,
} from "./utils"
import { TestScriptReport } from "./test-runner"
import { PreRequestScriptReport } from "./preRequest"

type APIDefPair<U extends APIDefinition<string, unknown>> = {
  [key in U["id"]]: U
}

type APIRegistryPair<T extends (...args: any) => any> = APIDefPair<
  ReturnType<T>
>

// PLACE ALL VALID APIS HERE
type APIRegistry = APIRegistryPair<typeof EnvAPI> &
  APIRegistryPair<typeof TestAPI> &
  APIRegistryPair<typeof ArtifactAPI>

type APIRegistryID = APIRegistry[keyof APIRegistry] extends APIDefinition<
  infer U,
  any
>
  ? U
  : never

type APIRegistryExposedWithID<ID extends APIRegistryID> =
  APIRegistry[ID] extends APIDefinition<ID, infer U> ? U : never

/**
 * Temporary variable to store the currently completed instance of APIs during a init call
 */
let completedAPIs: Array<APIInstance<string, unknown>> = []

/**
 * Access an already initialized API's exposed functions
 * @param apiID The ID of the API you want to expose
 * @returns The exposed info for the requested API
 */
export const useAPIExposed = <ID extends APIRegistryID>(
  apiID: ID
): APIRegistryExposedWithID<ID> =>
  pipe(
    completedAPIs,
    A.findFirst((def) => def.id === apiID),
    O.map((x) => x.exposes),
    O.getOrElseW(() =>
      throwErr(
        `Could not find API with ID ${apiID}. Make sure the API is above in the initialization order`
      )
    ),
    (d) => unsafeCast<APIRegistryExposedWithID<ID>>(d) // We can't tell TypeScript directly how this will be true easily, hence a shortcut
  )

/**
 * Defines how the API will be mixed into the root handle
 */
export type APIDirLocation = ADT<{
  // This API should be mixed with the root object
  // For example, testing api should inject to pw.expect and pw.test (where root object is pw)
  mixWithRoot: Record<string, unknown>

  // This API should be put into its own namespace
  // For example, Artifact API injects its methods to hopp.artifact namespace (where root object is hopp)
  namespaced: { namespace: string }
}>

/**
 * Constructor for MixWithRoot API Mix Location
 */
export const MixWithRoot = <APIDirLocation>{ _type: "mixWithRoot" }

/**
 * Constructor for Namespaced API Mix Location
 * @param namespace Namespace of the API
 */
export const Namespaced = <T extends string>(namespace: T) =>
  <APIDirLocation>{ _type: "namespaced", namespace }

/**
 * Defines the structure of one API Directory Entry
 */
export type APIDirEntry<ID extends string, Exposed> = [
  APIDefinition<ID, Exposed>,
  APIDirLocation
]

/**
 * Constructor for a single API directory entry.
 * Used for allowing for Type Inference
 */
export const api: <ID extends string, Exposed>(
  x: APIDirEntry<ID, Exposed>
) => APIDirEntry<ID, Exposed> = identity

/**
 * Initalizes an API directory
 * @param vm A QJS Context
 * @returns Array of Tuples of the Instantiated APIs and the mix location
 */
const initAPIs =
  (vm: QuickJSContext) => (apis: Array<APIDirEntry<string, unknown>>) =>
    pipe(
      apis,
      A.map(
        flow(
          Tu.mapFst(initializeAPI(vm)),
          // Add the element to the completedAPIs list so we can get the list in `useExposedAPIs`
          unsafeEffect(([instance]) => completedAPIs.push(instance))
        )
      ),
      // Once all initializations are done, clear the completedAPIs as nothing more is going to be inited
      unsafeEffect(() => {
        completedAPIs = []
      })
    )

/**
 * Defines how an API is to be injected to the root handle directly
 * @param vm A QJS Context
 * @param rootHandle Root Handle to Inject to
 * @param api The instantiated API to inject
 */
const injectToRoot = (
  vm: QuickJSContext,
  rootHandle: QuickJSHandle,
  api: APIInstance<string, unknown>
) => {
  pipe(
    api.rootHandle,
    getObjectKeysFromHandle(vm),
    A.map((key) => vm.setProp(rootHandle, key, vm.getProp(api.rootHandle, key)))
  )
}

/**
 * Defines how an API should be injected to a namespace
 * @param vm A QJS Context
 * @param rootHandle The root handle to inject namespace to
 * @param api The instantiated API to hook to
 * @param namespace Namespace to place under
 */
const injectToNamespace = (
  vm: QuickJSContext,
  rootHandle: QuickJSHandle,
  api: APIInstance<string, unknown>,
  namespace: string
) => {
  vm.setProp(rootHandle, namespace, api.rootHandle)
}

/**
 * Decides how to inject an API from its location specified in the directory
 * @param vm A QJS Context
 * @param rootHandle The root handle to inject to
 */
const injectAPI =
  (vm: QuickJSContext, rootHandle: QuickJSHandle) =>
    ([initedAPI, location]: [
      APIInstance<string, unknown>,
      APIDirLocation
    ]) =>
      pipe(
        location,
        match({
          mixWithRoot: () => injectToRoot(vm, rootHandle, initedAPI),
          namespaced: ({ namespace }) =>
            injectToNamespace(vm, rootHandle, initedAPI, namespace),
        })
      )

export const installAPIs = (
  vm: QuickJSContext,
  rootHandle: QuickJSHandle,
  apis: APIDirEntry<string, unknown>[]
) => {
  const initedAPIs = initAPIs(vm)(apis)
  const instances: APIInstance<string, unknown>[] = []

  for (const initedAPI of initedAPIs) {
    injectAPI(vm, rootHandle)(initedAPI)

    const instance = initedAPI[0]
    const parentHandle = instance.rootHandle
    const apis = instance.apis
    const childInstances = installAPIs(vm, parentHandle, apis);

    instances.push.apply(instances, childInstances)
    instances.push(initedAPI[0])
  }

  return instances
}

/**
 * An ADT describing how an API completes
 */
type Completer = ADT<{
  preRequestScript: { report: PreRequestScriptReport }
  testScript: { report: TestScriptReport }
}>

/**
 * Constructor for a Completer for a Pre Request Script
 * @param report The Pre Request Report
 */
export const PreRequestCompleter = (report: PreRequestScriptReport) =>
  ({ _type: "preRequestScript", report } as const)

/**
 * Constructor for a Completer for a Test Script
 * @param report The Test Script Report
 */
export const TestScriptCompleter = (report: TestScriptReport) =>
  ({ _type: "testScript", report } as const)

/**
 * Completes a single API
 * @param completer The Completer data to apply
 * @param instance The instance to complete
 */
const completeAPI = (
  completer: Completer,
  instance: APIInstance<string, unknown>
) =>
  pipe(
    completer,
    match({
      preRequestScript: ({ report }) =>
        PreRequestCompleter(instance.onPreRequestScriptComplete(report)),
      testScript: ({ report }) =>
        TestScriptCompleter(instance.onTestScriptComplete(report)),
    }),
    // Close the handle of the API instance
    unsafeEffect(() => {
      instance.rootHandle.dispose()
    })
  )

/**
 * Completes all the APIs specified sequentially
 * @param instances All the instances to be completed
 * @param completer The completer to apply initially
 * @returns The completed report
 */
export const completeAPIs = <T extends Completer>(
  instances: APIInstance<string, unknown>[],
  completer: T
): T["report"] =>
  pipe(
    instances,
    A.reduce(completer, completeAPI),
    (x) => x.report
    // unsafeCast<T> // Just to keep the public API more clean
  )
