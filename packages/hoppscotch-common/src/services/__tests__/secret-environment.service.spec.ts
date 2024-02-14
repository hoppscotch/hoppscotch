import { describe, expect, it, beforeEach } from "vitest"
import { TestContainer } from "dioc/testing"
import { SecretEnvironmentService } from "../secret-environment.service"

describe("SecretEnvironmentService", () => {
  let container: TestContainer
  let service: SecretEnvironmentService

  beforeEach(() => {
    container = new TestContainer()
    service = container.bind(SecretEnvironmentService)
  })

  describe("addSecretEnvironment", () => {
    it("should add a new secret environment with the provided ID and secret variables", () => {
      const id = "testEnvironment"
      const secretVars = [{ key: "key1", value: "value1", varIndex: 1 }]

      service.addSecretEnvironment(id, secretVars)

      expect(service.secretEnvironments.get(id)).toEqual(secretVars)
    })
  })

  describe("getSecretEnvironment", () => {
    it("should return the secret variables of the specified environment", () => {
      const id = "testEnvironment"
      const secretVars = [{ key: "key1", value: "value1", varIndex: 1 }]

      service.secretEnvironments.set(id, secretVars)

      expect(service.getSecretEnvironment(id)).toEqual(secretVars)
    })

    it("should return undefined if the specified environment does not exist", () => {
      const id = "nonExistentEnvironment"

      expect(service.getSecretEnvironment(id)).toBeUndefined()
    })
  })

  describe("getSecretEnvironmentVariable", () => {
    it("should return the specified secret environment variable", () => {
      const id = "testEnvironment"
      const secretVars = [{ key: "key1", value: "value1", varIndex: 1 }]

      service.secretEnvironments.set(id, secretVars)

      const result = service.getSecretEnvironmentVariable(id, 1)

      expect(result).toEqual(secretVars[0])
    })

    it("should return undefined if the specified variable does not exist", () => {
      const id = "testEnvironment"
      const secretVars = [{ key: "key1", value: "value1", varIndex: 1 }]

      service.secretEnvironments.set(id, secretVars)

      const result = service.getSecretEnvironmentVariable(id, 2)

      expect(result).toBeUndefined()
    })

    it("should return undefined if the specified environment does not exist", () => {
      const id = "nonExistentEnvironment"

      const result = service.getSecretEnvironmentVariable(id, 1)

      expect(result).toBeUndefined()
    })
  })

  describe("getSecretEnvironmentVariableValue", () => {
    it("should return the value of the specified secret environment variable", () => {
      const id = "testEnvironment"
      const secretVars = [{ key: "key1", value: "value1", varIndex: 1 }]

      service.secretEnvironments.set(id, secretVars)

      const result = service.getSecretEnvironmentVariableValue(id, 1)

      expect(result).toEqual(secretVars[0].value)
    })

    it("should return undefined if the specified variable does not exist", () => {
      const id = "testEnvironment"
      const secretVars = [{ key: "key1", value: "value1", varIndex: 1 }]

      service.secretEnvironments.set(id, secretVars)

      const result = service.getSecretEnvironmentVariableValue(id, 2)

      expect(result).toBeUndefined()
    })

    it("should return undefined if the specified environment does not exist", () => {
      const id = "nonExistentEnvironment"

      const result = service.getSecretEnvironmentVariableValue(id, 1)

      expect(result).toBeUndefined()
    })
  })

  describe("loadSecretEnvironmentsFromPersistedState", () => {
    it("should load secret environments from the persisted state", () => {
      const persistedState = {
        testEnvironment: [{ key: "key1", value: "value1", varIndex: 1 }],
      }

      service.loadSecretEnvironmentsFromPersistedState(persistedState)

      expect(service.secretEnvironments.size).toBe(1)
      expect(service.secretEnvironments.get("testEnvironment")).toEqual([
        { key: "key1", value: "value1", varIndex: 1 },
      ])
    })
  })

  describe("deleteSecretEnvironment", () => {
    it("should delete the specified secret environment", () => {
      const id = "testEnvironment"
      const secretVars = [{ key: "key1", value: "value1", varIndex: 1 }]

      service.secretEnvironments.set(id, secretVars)

      service.deleteSecretEnvironment(id)

      expect(service.secretEnvironments.has(id)).toBe(false)
    })
  })

  describe("removeSecretEnvironmentVariable", () => {
    it("should remove the specified secret environment variable", () => {
      const id = "testEnvironment"
      const secretVars = [
        { key: "key1", value: "value1", varIndex: 1 },
        { key: "key2", value: "value2", varIndex: 2 },
      ]

      service.secretEnvironments.set(id, secretVars)

      service.removeSecretEnvironmentVariable(id, 1)

      expect(service.secretEnvironments.get(id)).toEqual([
        { key: "key2", value: "value2", varIndex: 2 },
      ])
    })

    it("should do nothing if the specified variable does not exist", () => {
      const id = "testEnvironment"
      const secretVars = [{ key: "key1", value: "value1", varIndex: 1 }]

      service.secretEnvironments.set(id, secretVars)

      service.removeSecretEnvironmentVariable(id, 2)

      expect(service.secretEnvironments.get(id)).toEqual(secretVars)
    })
  })

  describe("updateSecretEnvironmentID", () => {
    it("should update the ID of the specified secret environment", () => {
      const oldID = "oldEnvironment"
      const newID = "newEnvironment"
      const secretVars = [{ key: "key1", value: "value1", varIndex: 1 }]

      service.secretEnvironments.set(oldID, secretVars)

      service.updateSecretEnvironmentID(oldID, newID)

      expect(service.secretEnvironments.has(oldID)).toBe(false)
      expect(service.secretEnvironments.get(newID)).toEqual(secretVars)
    })
  })

  describe("persistableSecretEnvironments", () => {
    it("should return a record of secret environments suitable for persistence", () => {
      const secretVars = [
        { key: "key1", value: "value1", varIndex: 1 },
        { key: "key2", value: "value2", varIndex: 2 },
      ]

      service.secretEnvironments.set("environment1", secretVars)

      const persistedState = service.persistableSecretEnvironments.value

      expect(persistedState).toEqual({
        environment1: secretVars,
      })
    })
  })
})
