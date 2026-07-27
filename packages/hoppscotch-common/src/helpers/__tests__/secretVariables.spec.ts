import { HoppCollection } from "@hoppscotch/data"
import { beforeEach, describe, expect, it } from "vitest"

import { getService } from "~/modules/dioc"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import {
  flushLocalStoresForTeamCollectionTree,
  flushUnmatchedRefIdsFromTree,
  indexCollectionsByRefId,
  populateLocalStoresFromCollectionTree,
  populateLocalStoresFromVariables,
  repopulateLoadedCollectionTree,
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

  it("keeps both initialValue and currentValue for non-secret variables", () => {
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
        currentValue: "https://staging.example.com",
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

  it("preserves an explicit empty currentValue for non-secrets", () => {
    // `""` is a meaningful "user cleared this" value — must NOT fall
    // through to `initialValue`. Only nullish (missing) currentValue
    // triggers the fallback.
    populateLocalStoresFromVariables(ENTITY_ID, [
      {
        key: "host",
        initialValue: "https://api.example.com",
        currentValue: "",
        secret: false,
      },
    ])

    expect(currentValueService.getEnvironment(ENTITY_ID)).toEqual([
      {
        key: "host",
        currentValue: "",
        varIndex: 0,
        isSecret: false,
      },
    ])
  })

  it("falls back to initialValue when non-secret currentValue is absent", () => {
    // Missing (undefined) currentValue — not an explicit clear — falls
    // through to `initialValue`.
    populateLocalStoresFromVariables(ENTITY_ID, [
      {
        key: "host",
        initialValue: "https://api.example.com",
        currentValue: undefined as unknown as string,
        secret: false,
      },
    ])

    expect(currentValueService.getEnvironment(ENTITY_ID)).toEqual([
      {
        key: "host",
        currentValue: "https://api.example.com",
        varIndex: 0,
        isSecret: false,
      },
    ])
  })

  it("preserves an explicit empty currentValue for secrets", () => {
    // An explicit `""` is a deliberate clear and must not be resurrected
    // from `initialValue` — otherwise rehydrating an existing global where
    // the user cleared `currentValue` while keeping `initialValue` would
    // silently restore the old secret on the next import/merge.
    populateLocalStoresFromVariables(ENTITY_ID, [
      {
        key: "token",
        initialValue: "old-secret",
        currentValue: "",
        secret: true,
      },
    ])

    expect(secretService.getSecretEnvironment(ENTITY_ID)).toEqual([
      {
        key: "token",
        value: "",
        initialValue: "old-secret",
        varIndex: 0,
      },
    ])
  })

  it("falls back to initialValue for secrets when currentValue is absent", () => {
    // Nullish (missing) `currentValue` — distinct from an explicit clear —
    // falls through to `initialValue`. Covers the legacy `hoppEnv` import
    // shape where only `initialValue` is present on the entry.
    populateLocalStoresFromVariables(ENTITY_ID, [
      {
        key: "token",
        initialValue: "imported-secret",
        currentValue: undefined as unknown as string,
        secret: true,
      },
    ])

    expect(secretService.getSecretEnvironment(ENTITY_ID)).toEqual([
      {
        key: "token",
        value: "imported-secret",
        initialValue: "imported-secret",
        varIndex: 0,
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

  it("promotes initialValue to value for foreign-import secrets (Postman/Insomnia)", () => {
    // `postman.ts` and `insomnia/insomniaColl.ts` set `currentValue: ""` while
    // putting the secret in `initialValue`. The collection-tree populate must
    // promote so the imported secret survives in the secret service.
    populateLocalStoresFromCollectionTree(
      buildCollection("postman-style", [
        {
          key: "api_key",
          initialValue: "pm-secret",
          currentValue: "",
          secret: true,
        },
      ])
    )

    expect(secretService.getSecretEnvironment("postman-style")).toEqual([
      {
        key: "api_key",
        value: "pm-secret",
        initialValue: "pm-secret",
        varIndex: 0,
      },
    ])
  })
})

describe("indexCollectionsByRefId + repopulateLoadedCollectionTree", () => {
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

  // The key invariant: if the backend reorders the loaded tree, the
  // repopulate logic must still pair each loaded node with its original
  // by `_ref_id` rather than by array index. Otherwise secrets would
  // re-key onto the wrong collection.
  it("re-keys secrets by ref-id when the loaded tree is reordered", () => {
    const originalA = buildCollection("ref-a", [
      { key: "a-tok", initialValue: "ai", currentValue: "ac", secret: true },
    ])
    const originalB = buildCollection("ref-b", [
      { key: "b-tok", initialValue: "bi", currentValue: "bc", secret: true },
    ])

    const originalsByRefId = new Map<string, HoppCollection>()
    indexCollectionsByRefId([originalA, originalB], originalsByRefId)

    // Backend round-trip: same ref-ids preserved via `data._ref_id`,
    // but order is reversed. Variables on the loaded tree are stripped
    // (initialValue: "" for secrets, currentValue: "" everywhere).
    const stripped = (refId: string, key: string) =>
      buildCollection(refId, [
        { key, initialValue: "", currentValue: "", secret: true },
      ])
    const loadedReordered = [
      stripped("ref-b", "b-tok"),
      stripped("ref-a", "a-tok"),
    ]

    loadedReordered.forEach((c) =>
      repopulateLoadedCollectionTree(c, originalsByRefId)
    )

    expect(secretService.getSecretEnvironment("ref-a")).toEqual([
      { key: "a-tok", value: "ac", initialValue: "ai", varIndex: 0 },
    ])
    expect(secretService.getSecretEnvironment("ref-b")).toEqual([
      { key: "b-tok", value: "bc", initialValue: "bi", varIndex: 0 },
    ])
  })

  it("indexes nested folders into the same flat map", () => {
    const grandchild = buildCollection("gc", [])
    const child = buildCollection("child", [], [grandchild])
    const root = buildCollection("root", [], [child])

    const map = new Map<string, HoppCollection>()
    indexCollectionsByRefId([root], map)

    expect([...map.keys()].sort()).toEqual(["child", "gc", "root"])
    expect(map.get("gc")).toBe(grandchild)
  })

  it("skips loaded nodes whose ref-id is absent from the original index", () => {
    const original = buildCollection("ref-a", [
      { key: "a-tok", initialValue: "ai", currentValue: "ac", secret: true },
    ])
    const map = new Map<string, HoppCollection>()
    indexCollectionsByRefId([original], map)

    // Backend dropped the ref-id round-trip on this node — the loaded
    // tree carries a fresh ref-id that the original index doesn't know.
    const orphanLoaded = buildCollection("ref-a-fresh", [
      { key: "a-tok", initialValue: "", currentValue: "", secret: true },
    ])

    repopulateLoadedCollectionTree(orphanLoaded, map)

    // Nothing was populated for the unknown ref-id, and the original's
    // ref-id is also untouched (no spurious cross-population).
    expect(secretService.getSecretEnvironment("ref-a-fresh")).toBeUndefined()
    expect(secretService.getSecretEnvironment("ref-a")).toBeUndefined()
  })

  it("recurses through nested folders and re-keys each by its own ref-id", () => {
    const childOriginal = buildCollection("child", [
      { key: "ck", initialValue: "ci", currentValue: "cc", secret: true },
    ])
    const rootOriginal = buildCollection(
      "root",
      [{ key: "rk", initialValue: "ri", currentValue: "rc", secret: true }],
      [childOriginal]
    )

    const map = new Map<string, HoppCollection>()
    indexCollectionsByRefId([rootOriginal], map)

    // Loaded tree from backend: same ref-ids, stripped variables.
    const childLoaded = buildCollection("child", [
      { key: "ck", initialValue: "", currentValue: "", secret: true },
    ])
    const rootLoaded = buildCollection(
      "root",
      [{ key: "rk", initialValue: "", currentValue: "", secret: true }],
      [childLoaded]
    )

    repopulateLoadedCollectionTree(rootLoaded, map)

    expect(secretService.getSecretEnvironment("root")).toEqual([
      { key: "rk", value: "rc", initialValue: "ri", varIndex: 0 },
    ])
    expect(secretService.getSecretEnvironment("child")).toEqual([
      { key: "ck", value: "cc", initialValue: "ci", varIndex: 0 },
    ])
  })

  it("promotes foreign-import secrets when re-seeding after backend round-trip", () => {
    // Selfhost-web personal-workspace flow: user imports a Postman collection,
    // backend round-trip succeeds, then `repopulateLoadedCollectionTree` re-seeds
    // local stores from the pre-strip original. The original still carries the
    // Postman convention (`currentValue: ""` + `initialValue: "X"` for secrets),
    // so the re-seed must promote — otherwise the round-trip would overwrite
    // the secret service entry that the earlier collection-tree populate set.
    const original = buildCollection("ref-pm", [
      {
        key: "api_key",
        initialValue: "pm-secret",
        currentValue: "",
        secret: true,
      },
    ])

    const map = new Map<string, HoppCollection>()
    indexCollectionsByRefId([original], map)

    const loaded = buildCollection("ref-pm", [
      { key: "api_key", initialValue: "", currentValue: "", secret: true },
    ])

    repopulateLoadedCollectionTree(loaded, map)

    expect(secretService.getSecretEnvironment("ref-pm")).toEqual([
      {
        key: "api_key",
        value: "pm-secret",
        initialValue: "pm-secret",
        varIndex: 0,
      },
    ])
  })
})

describe("flushUnmatchedRefIdsFromTree", () => {
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

  it("deletes entries whose `_ref_id` is not in the kept set", () => {
    secretService.addSecretEnvironment("ref-orphan", [
      { key: "k", value: "v", initialValue: "v", varIndex: 0 },
    ])
    currentValueService.addEnvironment("ref-orphan", [
      { key: "k", currentValue: "v", varIndex: 0, isSecret: false },
    ])

    flushUnmatchedRefIdsFromTree([buildCollection("ref-orphan", [])], new Set())

    expect(secretService.getSecretEnvironment("ref-orphan")).toBeUndefined()
    expect(currentValueService.getEnvironment("ref-orphan")).toBeUndefined()
  })

  it("keeps entries whose `_ref_id` is in the kept set", () => {
    secretService.addSecretEnvironment("ref-kept", [
      { key: "k", value: "v", initialValue: "v", varIndex: 0 },
    ])

    flushUnmatchedRefIdsFromTree(
      [buildCollection("ref-kept", [])],
      new Set(["ref-kept"])
    )

    expect(secretService.getSecretEnvironment("ref-kept")).toBeDefined()
  })

  it("recurses into folders, flushing each unmatched descendant", () => {
    secretService.addSecretEnvironment("ref-root", [
      { key: "k", value: "v", initialValue: "v", varIndex: 0 },
    ])
    secretService.addSecretEnvironment("ref-child", [
      { key: "k", value: "v", initialValue: "v", varIndex: 0 },
    ])
    secretService.addSecretEnvironment("ref-kept", [
      { key: "k", value: "v", initialValue: "v", varIndex: 0 },
    ])

    const child = buildCollection("ref-child", [])
    const root = buildCollection("ref-root", [], [child])
    const kept = buildCollection("ref-kept", [])

    flushUnmatchedRefIdsFromTree([root, kept], new Set(["ref-kept"]))

    expect(secretService.getSecretEnvironment("ref-root")).toBeUndefined()
    expect(secretService.getSecretEnvironment("ref-child")).toBeUndefined()
    expect(secretService.getSecretEnvironment("ref-kept")).toBeDefined()
  })
})

describe("flushLocalStoresForTeamCollectionTree", () => {
  let secretService: SecretEnvironmentService
  let currentValueService: CurrentValueService

  beforeEach(() => {
    secretService = getService(SecretEnvironmentService)
    currentValueService = getService(CurrentValueService)
    secretService.secretEnvironments.clear()
    currentValueService.environments.clear()
  })

  it("deletes the top-level entry by team backend `id`", () => {
    secretService.addSecretEnvironment("team-coll-1", [
      { key: "k", value: "v", initialValue: "v", varIndex: 0 },
    ])
    currentValueService.addEnvironment("team-coll-1", [
      { key: "k", currentValue: "v", varIndex: 0, isSecret: false },
    ])

    flushLocalStoresForTeamCollectionTree({
      id: "team-coll-1",
      children: null,
    })

    expect(secretService.getSecretEnvironment("team-coll-1")).toBeUndefined()
    expect(currentValueService.getEnvironment("team-coll-1")).toBeUndefined()
  })

  it("recurses into `children` and flushes every descendant", () => {
    secretService.addSecretEnvironment("root", [
      { key: "k", value: "v", initialValue: "v", varIndex: 0 },
    ])
    secretService.addSecretEnvironment("child-1", [
      { key: "k", value: "v", initialValue: "v", varIndex: 0 },
    ])
    secretService.addSecretEnvironment("grandchild", [
      { key: "k", value: "v", initialValue: "v", varIndex: 0 },
    ])

    flushLocalStoresForTeamCollectionTree({
      id: "root",
      children: [
        {
          id: "child-1",
          children: [{ id: "grandchild", children: null }],
        },
      ],
    })

    expect(secretService.getSecretEnvironment("root")).toBeUndefined()
    expect(secretService.getSecretEnvironment("child-1")).toBeUndefined()
    expect(secretService.getSecretEnvironment("grandchild")).toBeUndefined()
  })
})
