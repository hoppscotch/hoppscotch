import { describe, it, expect, beforeEach } from "vitest"
import { TestContainer } from "dioc/testing"
import {
  CurrentValueService,
  Variable,
} from "../current-environment-value.service"

describe("CurrentValueService", () => {
  let container: TestContainer
  let service: CurrentValueService

  beforeEach(() => {
    container = new TestContainer()
    service = container.bind(CurrentValueService)
  })

  describe("addEnvironment", () => {
    it("should add a new environment with the provided ID and variables", () => {
      const id = "env1"
      const vars: Variable[] = [
        { key: "key1", currentValue: "value1", varIndex: 1, isSecret: false },
      ]
      service.addEnvironment(id, vars)
      expect(service.environments.get(id)).toEqual(vars)
    })
  })

  describe("getEnvironment", () => {
    it("should return the variables of the specified environment", () => {
      const id = "env1"
      const vars: Variable[] = [
        { key: "key1", currentValue: "value1", varIndex: 1, isSecret: false },
      ]
      service.environments.set(id, vars)
      expect(service.getEnvironment(id)).toEqual(vars)
    })

    it("should return undefined for non-existent environment", () => {
      expect(service.getEnvironment("nonexistent")).toBeUndefined()
    })
  })

  describe("getEnvironmentVariable", () => {
    it("should return the variable at the given index", () => {
      const id = "env1"
      const vars: Variable[] = [
        { key: "key1", currentValue: "value1", varIndex: 1, isSecret: false },
      ]
      service.environments.set(id, vars)
      expect(service.getEnvironmentVariable(id, 1)).toEqual(vars[0])
    })

    it("should return undefined for non-existent variable", () => {
      const id = "env1"
      const vars: Variable[] = [
        { key: "key1", currentValue: "value1", varIndex: 1, isSecret: false },
      ]
      service.environments.set(id, vars)
      expect(service.getEnvironmentVariable(id, 2)).toBeUndefined()
    })
  })

  describe("getEnvironmentVariableValue", () => {
    it("should return the value of the variable", () => {
      const id = "env1"
      const vars: Variable[] = [
        { key: "key1", currentValue: "value1", varIndex: 1, isSecret: false },
      ]
      service.environments.set(id, vars)
      expect(service.getEnvironmentVariableValue(id, 1)).toBe("value1")
    })

    it("should return undefined if variable doesn't exist", () => {
      expect(service.getEnvironmentVariableValue("env1", 999)).toBeUndefined()
    })
  })

  describe("loadEnvironmentsFromPersistedState", () => {
    it("should load environments correctly", () => {
      const state = {
        env1: [{ key: "k", currentValue: "v", varIndex: 0, isSecret: false }],
      }
      service.loadEnvironmentsFromPersistedState(state)
      expect(service.environments.get("env1")).toEqual(state.env1)
    })
  })

  describe("deleteEnvironment", () => {
    it("should delete the specified environment", () => {
      const id = "env1"
      service.environments.set(id, [])
      service.deleteEnvironment(id)
      expect(service.environments.has(id)).toBe(false)
    })
  })

  describe("removeEnvironmentVariable", () => {
    it("should remove the specified variable", () => {
      const id = "env1"
      const vars = [
        { key: "key1", currentValue: "value1", varIndex: 1, isSecret: false },
        { key: "key2", currentValue: "value2", varIndex: 2, isSecret: false },
      ]
      service.environments.set(id, vars)
      service.removeEnvironmentVariable(id, 1)
      expect(service.environments.get(id)).toEqual([vars[1]])
    })

    it("should not fail if variable does not exist", () => {
      const id = "env1"
      const vars = [
        { key: "key1", currentValue: "value1", varIndex: 1, isSecret: false },
      ]
      service.environments.set(id, vars)
      service.removeEnvironmentVariable(id, 999)
      expect(service.environments.get(id)).toEqual(vars)
    })
  })

  describe("updateEnvironmentID", () => {
    it("should update the environment ID", () => {
      const oldID = "old"
      const newID = "new"
      const vars = [
        { key: "k", currentValue: "v", varIndex: 0, isSecret: false },
      ]
      service.environments.set(oldID, vars)
      service.updateEnvironmentID(oldID, newID)
      expect(service.environments.has(oldID)).toBe(false)
      expect(service.environments.get(newID)).toEqual(vars)
    })
  })

  describe("hasValue", () => {
    it("should return true if a variable with the key and non-empty value exists", () => {
      const id = "env1"
      const vars = [
        { key: "k", currentValue: "v", varIndex: 0, isSecret: true },
      ]
      service.environments.set(id, vars)
      expect(service.hasValue(id, "k")).toBe(true)
    })

    it("should return false if no variable with key exists or value is empty", () => {
      service.environments.set("env1", [
        { key: "k", currentValue: "", varIndex: 0, isSecret: true },
      ])
      expect(service.hasValue("env1", "k")).toBe(false)
    })
  })

  describe("getEnvironmentByKey", () => {
    it("should return variable by key", () => {
      const id = "env1"
      const vars = [
        { key: "k", currentValue: "v", varIndex: 1, isSecret: false },
      ]
      service.environments.set(id, vars)
      expect(service.getEnvironmentByKey(id, "k")).toEqual(vars[0])
    })

    it("should return undefined if key not found", () => {
      service.environments.set("env1", [])
      expect(service.getEnvironmentByKey("env1", "k")).toBeUndefined()
    })
  })

  describe("persistableEnvironments", () => {
    it("should return the environments in persistable format", () => {
      const id = "env1"
      const vars = [
        { key: "k", currentValue: "v", varIndex: 0, isSecret: false },
      ]
      service.environments.set(id, vars)
      expect(service.persistableEnvironments.value).toEqual({ [id]: vars })
    })
  })
})
