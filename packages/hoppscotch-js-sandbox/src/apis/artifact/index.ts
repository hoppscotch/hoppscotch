import cloneDeep from "lodash/cloneDeep"
import { defineAPI, onPreRequestScriptComplete } from "../../api"
import {
  defineVmFn,
  disposeHandlers,
  VmFnPairs,
  setFnHandlers,
} from "../../utils"

export type Artifacts = Record<string, string | undefined>

type ArtifactKeys = "create" | "get" | "update" | "delete"

export default (initialArtifacts: Artifacts) =>
  defineAPI("artifact", (vm) => {
    const handle = vm.newObject()

    const currentArtifacts: Artifacts = cloneDeep(initialArtifacts)

    const createHandleFn = defineVmFn((keyHandle, valueHandle) => {
      const key: unknown = vm.dump(keyHandle)
      const value: unknown = vm.dump(valueHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      if (typeof value !== "string") {
        return {
          error: vm.newString("Expected value to be a string"),
        }
      }

      if (!currentArtifacts[key]) {
        currentArtifacts[key] = value
      }

      return {
        value: vm.undefined,
      }
    })

    const getHandleFn = defineVmFn((keyHandle) => {
      const key: unknown = vm.dump(keyHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      const value = currentArtifacts[key]

      return {
        value: value === undefined ? vm.undefined : vm.newString(value),
      }
    })

    const deleteHandleFn = defineVmFn((keyHandle) => {
      const key: unknown = vm.dump(keyHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      if (!currentArtifacts[key]) {
        return {
          error: vm.newString("Artifact key doesn't exist"),
        }
      }

      delete currentArtifacts[key]

      return {
        value: vm.undefined,
      }
    })

    const updateHandleFn = defineVmFn((keyHandle, valueHandle) => {
      const key: unknown = vm.dump(keyHandle)
      const value: unknown = vm.dump(valueHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      if (typeof value !== "string") {
        return {
          error: vm.newString("Expected value to be a string"),
        }
      }

      if (!currentArtifacts[key]) {
        return {
          error: vm.newString("Artifact key doesn't exist"),
        }
      }

      currentArtifacts[key] = value

      return {
        value: vm.undefined,
      }
    })

    const vmFnPairs: VmFnPairs<ArtifactKeys>[] = [
      { key: "create", func: createHandleFn },
      { key: "delete", func: deleteHandleFn },
      { key: "get", func: getHandleFn },
      { key: "update", func: updateHandleFn },
    ]

    const handlers = setFnHandlers(vm, handle, vmFnPairs)
    disposeHandlers(handlers)

    const exposed = {
      getArtifacts: () => currentArtifacts,
    }

    onPreRequestScriptComplete((report) => ({
      ...report,
      artifacts: {
        ...report.artifacts,
        ...currentArtifacts,
      },
    }))

    return {
      rootHandle: handle,
      exposes: exposed,
      childAPIs: [],
    }
  })
