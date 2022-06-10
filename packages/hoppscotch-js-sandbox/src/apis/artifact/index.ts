import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as qjs from "quickjs-emscripten"
import { Artifacts } from "./types"
import {
  createArtifact,
  deleteArtifact,
  getArtifact,
  updateArtifact,
} from "./utils"

export const artifactHandler = (
  vm: qjs.QuickJSContext,
  artifacts: Artifacts
): qjs.QuickJSHandle => {
  const artifactHandle = vm.newObject()

  /**
   * Method to create new artifact for given key-value.
   */
  const artifactCreateHandle = vm.newFunction(
    "create",
    (keyHandle, valueHandle) => {
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

      artifacts = createArtifact(key, value, artifacts)

      return {
        value: vm.undefined,
      }
    }
  )

  /**
   * Method to get value for given key in artifacts.
   */
  const artifactGetHandle = vm.newFunction("get", (keyHandle) => {
    const key: unknown = vm.dump(keyHandle)

    if (typeof key !== "string") {
      return {
        error: vm.newString("Expected key to be a string"),
      }
    }

    const result = pipe(
      getArtifact(key, artifacts),
      O.match(
        () => vm.undefined,
        (value) => vm.newString(value)
      )
    )

    return {
      value: result,
    }
  })

  /**
   * Method to update artifacts for given key.
   */
  const artifactUpdateHandle = vm.newFunction(
    "update",
    (keyHandle, newValueHandle) => {
      const key: unknown = vm.dump(keyHandle)
      const newValue: unknown = vm.dump(newValueHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      if (typeof newValue !== "string") {
        return {
          error: vm.newString("Expected value to be a string"),
        }
      }

      artifacts = updateArtifact(key, newValue, artifacts)

      return {
        value: vm.undefined,
      }
    }
  )

  /**
   * Method to delete from artifacts for given key.
   */
  const artifactDeleteHandle = vm.newFunction("delete", (keyHandle) => {
    const key: unknown = vm.dump(keyHandle)

    if (typeof key !== "string") {
      return {
        error: vm.newString("Expected key to be a string"),
      }
    }

    artifacts = deleteArtifact(key, artifacts)

    return {
      value: vm.undefined,
    }
  })

  vm.setProp(artifactHandle, "create", artifactCreateHandle)
  artifactCreateHandle.dispose()

  vm.setProp(artifactHandle, "get", artifactGetHandle)
  artifactGetHandle.dispose()

  vm.setProp(artifactHandle, "update", artifactUpdateHandle)
  artifactUpdateHandle.dispose()

  vm.setProp(artifactHandle, "delete", artifactDeleteHandle)
  artifactDeleteHandle.dispose()

  return artifactHandle
}
