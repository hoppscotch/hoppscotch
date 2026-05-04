import { HoppCollection } from "@hoppscotch/data"
import { beforeEach, describe, expect, it } from "vitest"

import { getService } from "~/modules/dioc"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import {
  populateLocalStoresFromCollectionTree,
  populateLocalStoresFromVariables,
  stripSecretVariableValuesForWire,
} from "../secretVariables"

const ENTITY_ID = "entity-1"

describe("stripSecretVariableValuesForWire", () => {
  it("clears both initialValue and currentValue for secret variables", () => {
    const result = stripSecretVariableValuesForWire([
      {
        key: "token",
        initialValue: "should-be-stripped",
        currentValue: "should-be-stripped",
        secret: true,
      },
    ])

    expect(result).toEqual([
      {
        key: "token",
        initialValue: "",
        currentValue: "",
        secret: true,
      },
    ])
  })

  it("keeps initialValue but clears currentValue for non-secret variables", () => {
    const result = stripSecretVariableValuesForWire([
      {
        key: "host",
        initialValue: "https://api.example.com",
        currentValue: "https://staging.example.com",
        secret: false,
      },
    ])

    expect(result).toEqual([
      {
        key: "host",
        initialValue: "https://api.example.com",
        currentValue: "",
        secret: false,
      },
    ])
  })

  it("preserves extra fields on each variable (forward-compatible with future schemas)", () => {
    const input = [
      {
        key: "x",
        initialValue: "v",
        currentValue: "v",
        secret: false,
        // hypothetical future field
        description: "the X variable",
      },
    ]

    const [out] = stripSecretVariableValuesForWire(input)
    expect(out.description).toBe("the X variable")
  })

  it("returns an empty array for empty input", () => {
    expect(stripSecretVariableValuesForWire([])).toEqual([])
  })
})

describe("populateLocalStoresFromVariables", () => {
  let secretService: SecretEnvironmentService
  let currentValueService: CurrentValueService

  beforeEach(() => {
    secretService = getService(SecretEnvironmentService)
    currentValueService = getService(CurrentValueService)
    secretService.secretEnvironments.delete(ENTITY_ID)
    currentValueService.environments.delete(ENTITY_ID)
  })

  it("writes secret variables to SecretEnvironmentService", () => {
    populateLocalStoresFromVariables(ENTITY_ID, [
      {
        key: "token",
        initialValue: "init-secret",
        currentValue: "current-secret",
        secret: true,
      },
    ])

    expect(secretService.getSecretEnvironment(ENTITY_ID)).toEqual([
      {
        key: "token",
        value: "current-secret",
        initialValue: "init-secret",
        varIndex: 0,
      },
    ])
  })

  it("writes non-secret currentValue entries to CurrentValueService", () => {
    populateLocalStoresFromVariables(ENTITY_ID, [
      {
        key: "host",
        initialValue: "https://api.example.com",
        currentValue: "https://staging.example.com",
        secret: false,
      },
    ])

    expect(currentValueService.getEnvironment(ENTITY_ID)).toEqual([
      {
        key: "host",
        currentValue: "https://staging.example.com",
        varIndex: 0,
        isSecret: false,
      },
    ])
  })

  it("preserves the variable index for mixed secret + non-secret entries", () => {
    populateLocalStoresFromVariables(ENTITY_ID, [
      {
        key: "host",
        initialValue: "init-host",
        currentValue: "cur-host",
        secret: false,
      },
      {
        key: "token",
        initialValue: "init-token",
        currentValue: "cur-token",
        secret: true,
      },
      {
        key: "version",
        initialValue: "v1",
        currentValue: "v2",
        secret: false,
      },
    ])

    expect(secretService.getSecretEnvironment(ENTITY_ID)).toEqual([
      {
        key: "token",
        value: "cur-token",
        initialValue: "init-token",
        varIndex: 1,
      },
    ])
    expect(currentValueService.getEnvironment(ENTITY_ID)).toEqual([
      {
        key: "host",
        currentValue: "cur-host",
        varIndex: 0,
        isSecret: false,
      },
      {
        key: "version",
        currentValue: "v2",
        varIndex: 2,
        isSecret: false,
      },
    ])
  })

  it("is a no-op when entityId is empty", () => {
    populateLocalStoresFromVariables("", [
      {
        key: "token",
        initialValue: "init",
        currentValue: "cur",
        secret: true,
      },
    ])

    expect(secretService.getSecretEnvironment("")).toBeUndefined()
  })

  it("writes empty arrays to both stores when variables is empty (clears stale)", () => {
    // First populate with secrets + non-secrets
    populateLocalStoresFromVariables(ENTITY_ID, [
      { key: "s", initialValue: "v", currentValue: "v", secret: true },
      { key: "n", initialValue: "v", currentValue: "v", secret: false },
    ])

    // Re-populate with empty variables — should wipe both stores
    populateLocalStoresFromVariables(ENTITY_ID, [])

    expect(secretService.getSecretEnvironment(ENTITY_ID)).toEqual([])
    expect(currentValueService.getEnvironment(ENTITY_ID)).toEqual([])
  })

  it("writes empty array to CurrentValueService when all entries are secret", () => {
    populateLocalStoresFromVariables(ENTITY_ID, [
      {
        key: "a",
        initialValue: "a",
        currentValue: "a",
        secret: true,
      },
    ])

    expect(currentValueService.getEnvironment(ENTITY_ID)).toEqual([])
  })

  it("writes empty array to SecretEnvironmentService when no entries are secret", () => {
    populateLocalStoresFromVariables(ENTITY_ID, [
      {
        key: "a",
        initialValue: "a",
        currentValue: "a",
        secret: false,
      },
    ])

    expect(secretService.getSecretEnvironment(ENTITY_ID)).toEqual([])
  })

  it("re-populating with fewer secrets clears the previous secret entries", () => {
    populateLocalStoresFromVariables(ENTITY_ID, [
      { key: "old1", initialValue: "1", currentValue: "1", secret: true },
      { key: "old2", initialValue: "2", currentValue: "2", secret: true },
    ])

    populateLocalStoresFromVariables(ENTITY_ID, [
      { key: "new", initialValue: "3", currentValue: "3", secret: true },
    ])

    expect(secretService.getSecretEnvironment(ENTITY_ID)).toEqual([
      {
        key: "new",
        value: "3",
        initialValue: "3",
        varIndex: 0,
      },
    ])
  })
})

describe("populateLocalStoresFromCollectionTree", () => {
  let secretService: SecretEnvironmentService
  let currentValueService: CurrentValueService

  beforeEach(() => {
    secretService = getService(SecretEnvironmentService)
    currentValueService = getService(CurrentValueService)
    secretService.secretEnvironments.clear()
    currentValueService.environments.clear()
  })

  const buildCollection = (
    refId: string,
    variables: HoppCollection["variables"],
    folders: HoppCollection[] = []
  ): HoppCollection => ({
    v: 12,
    name: `coll-${refId}`,
    _ref_id: refId,
    folders,
    requests: [],
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables,
    description: null,
    preRequestScript: "",
    testScript: "",
  })

  it("populates the secret store for the root collection", () => {
    populateLocalStoresFromCollectionTree(
      buildCollection("root", [
        { key: "tok", initialValue: "init", currentValue: "cur", secret: true },
      ])
    )

    expect(secretService.getSecretEnvironment("root")).toEqual([
      {
        key: "tok",
        value: "cur",
        initialValue: "init",
        varIndex: 0,
      },
    ])
  })

  it("recurses into nested folders, populating each by its own _ref_id", () => {
    const child = buildCollection("child-1", [
      {
        key: "child-tok",
        initialValue: "ci",
        currentValue: "cc",
        secret: true,
      },
    ])
    const grandchild = buildCollection("gc-1", [
      { key: "gc-tok", initialValue: "gi", currentValue: "gc", secret: true },
    ])
    child.folders = [grandchild]

    populateLocalStoresFromCollectionTree(
      buildCollection(
        "root",
        [
          {
            key: "r-tok",
            initialValue: "ri",
            currentValue: "rc",
            secret: true,
          },
        ],
        [child]
      )
    )

    expect(secretService.getSecretEnvironment("root")).toBeDefined()
    expect(secretService.getSecretEnvironment("child-1")).toBeDefined()
    expect(secretService.getSecretEnvironment("gc-1")).toEqual([
      {
        key: "gc-tok",
        value: "gc",
        initialValue: "gi",
        varIndex: 0,
      },
    ])
  })

  it("skips a node that has no _ref_id but still recurses into its folders", () => {
    const child = buildCollection("child-1", [
      { key: "tok", initialValue: "i", currentValue: "c", secret: true },
    ])

    const root = buildCollection("placeholder", [], [child])
    delete (root as Partial<HoppCollection>)._ref_id

    populateLocalStoresFromCollectionTree(root)

    expect(secretService.getSecretEnvironment("child-1")).toBeDefined()
    expect(secretService.getSecretEnvironment("placeholder")).toBeUndefined()
  })
})
