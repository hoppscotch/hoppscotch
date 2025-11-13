import { cloneDeep } from "lodash-es"
import { distinctUntilChanged, pluck } from "rxjs/operators"
import { computed, Ref } from "vue"
import {
  HoppReusableFunction,
  HoppReusableFunctionLibrary,
  makeDefaultHoppReusableFunctionLibrary,
  makeHoppReusableFunction
} from "@hoppscotch/data"
import { uniqueID } from "~/helpers/utils/uniqueID"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { useStream } from "@composables/stream"

const defaultReusableFunctionsState = makeDefaultHoppReusableFunctionLibrary()

const dispatchers = defineDispatchers({
  setReusableFunctions(
    _currentState: HoppReusableFunctionLibrary,
    { functions }: { functions: HoppReusableFunction[] }
  ) {
    return { functions: cloneDeep(functions) }
  },

  addReusableFunction(
    { functions }: HoppReusableFunctionLibrary,
    { function: newFunction }: { function: HoppReusableFunction }
  ) {
    return { functions: [...functions, cloneDeep(newFunction)] }
  },

  removeReusableFunction(
    { functions }: HoppReusableFunctionLibrary,
    { functionID }: { functionID: string }
  ) {
    return { functions: functions.filter((func) => func.id !== functionID) }
  },

  updateReusableFunction(
    { functions }: HoppReusableFunctionLibrary,
    { functionID, updates }: { functionID: string; updates: Partial<HoppReusableFunction> }
  ) {
    return {
      functions: functions.map((func) =>
        func.id === functionID
          ? { ...cloneDeep(func), ...updates, updatedAt: new Date().toISOString() }
          : func
      )
    }
  },

  duplicateReusableFunction(
    { functions }: HoppReusableFunctionLibrary,
    { functionID }: { functionID: string }
  ) {
    const functionToDuplicate = functions.find((func) => func.id === functionID)
    if (!functionToDuplicate) return {}

    const duplicatedFunction = makeHoppReusableFunction({
      ...cloneDeep(functionToDuplicate),
      id: uniqueID(),
      name: `${functionToDuplicate.name} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return { functions: [...functions, duplicatedFunction] }
  },

  clearReusableFunctions() {
    return { functions: [] }
  },
})

export const reusableFunctionsStore = new DispatchingStore(
  defaultReusableFunctionsState,
  dispatchers
)

export const reusableFunctions$ = reusableFunctionsStore.subject$.asObservable()

const reusableFunctionsList$ = reusableFunctions$.pipe(
  pluck("functions"),
  distinctUntilChanged()
)

export const setReusableFunctions = (functions: HoppReusableFunction[]) =>
  reusableFunctionsStore.dispatch({
    dispatcher: "setReusableFunctions",
    payload: { functions },
  })

export const addReusableFunction = (functionData: HoppReusableFunction) =>
  reusableFunctionsStore.dispatch({
    dispatcher: "addReusableFunction",
    payload: { function: functionData },
  })

export const removeReusableFunction = (functionID: string) =>
  reusableFunctionsStore.dispatch({
    dispatcher: "removeReusableFunction",
    payload: { functionID },
  })

export const updateReusableFunction = (
  functionID: string,
  updates: Partial<HoppReusableFunction>
) =>
  reusableFunctionsStore.dispatch({
    dispatcher: "updateReusableFunction",
    payload: { functionID, updates },
  })

export const duplicateReusableFunction = (functionID: string) =>
  reusableFunctionsStore.dispatch({
    dispatcher: "duplicateReusableFunction",
    payload: { functionID },
  })

export const clearReusableFunctions = () =>
  reusableFunctionsStore.dispatch({
    dispatcher: "clearReusableFunctions",
    payload: {},
  })

export const useReusableFunctions = (): Ref<HoppReusableFunction[]> =>
  useStream(reusableFunctionsList$, [], setReusableFunctions)

export const useReusableFunction = (functionID: string): Ref<HoppReusableFunction | null> => {
  const functions = useReusableFunctions()
  return computed(() => functions.value.find((func) => func.id === functionID) ?? null)
}

export const createNewReusableFunction = (
  name: string = "New Function",
  code: string = "function myFunction() {\n  return 'Hello, World!';\n}",
  description: string = ""
): HoppReusableFunction => {
  const newFunction = makeHoppReusableFunction({ name, code, description })
  addReusableFunction(newFunction)
  return newFunction
}