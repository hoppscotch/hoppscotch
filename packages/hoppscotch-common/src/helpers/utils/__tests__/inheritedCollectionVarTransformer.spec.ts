import { afterEach, describe, expect, test } from "vitest"
import { getService } from "~/modules/dioc"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import {
  populateValuesInInheritedCollectionVars,
  resolveInheritedVariables,
} from "../inheritedCollectionVarTransformer"

const currentValues = getService(CurrentValueService)
const secretEnvs = getService(SecretEnvironmentService)

// The services are module-scoped singletons — drop everything a test stored
// so no state leaks into the next one.
afterEach(() => {
  currentValues.environments.clear()
  secretEnvs.secretEnvironments.clear()
})

const collectionVar = (key: string, currentValue = "") => ({
  key,
  currentValue,
  initialValue: "",
  secret: false,
})

const secretCollectionVar = (key: string) => ({
  key,
  // Secret values never live on the collection JSON — only in
  // SecretEnvironmentService.
  currentValue: "",
  initialValue: "",
  secret: true,
})

const storedSecret = (key: string, value: string, varIndex: number) => ({
  key,
  value,
  varIndex,
})

const stored = (key: string, currentValue: string, varIndex: number) => ({
  key,
  currentValue,
  varIndex,
  isSecret: false,
})

describe("resolveInheritedVariables", () => {
  test("resolves each collection's variables under its own ID", () => {
    currentValues.addEnvironment("coll-c", [stored("A", "a-current", 0)])
    currentValues.addEnvironment("coll-f", [stored("B", "b-current", 0)])

    const levelC = resolveInheritedVariables([], [collectionVar("A")], "coll-c")
    const levelF = resolveInheritedVariables(
      levelC,
      [collectionVar("B")],
      "coll-f"
    )
    const levelG = resolveInheritedVariables(levelF, [], "coll-g")

    expect(levelG).toEqual([
      expect.objectContaining({ key: "A", currentValue: "a-current" }),
      expect.objectContaining({ key: "B", currentValue: "b-current" }),
    ])
  })

  // Re-resolving the MERGED array under one ID reads by index collision:
  // A (merged index 0) would be looked up at (F.id, 0) — B's storage slot.
  test("a folder's stored value is never assigned to an ancestor's variable", () => {
    // Only F has a stored current value.
    currentValues.addEnvironment("coll-f", [stored("B", "b-current", 0)])

    const levelC = resolveInheritedVariables(
      [],
      [collectionVar("A", "a-own")],
      "coll-c"
    )
    const levelF = resolveInheritedVariables(
      levelC,
      [collectionVar("B")],
      "coll-f"
    )
    const levelG = resolveInheritedVariables(levelF, [], "coll-g")

    const a = levelG.find(({ key }) => key === "A")
    const b = levelG.find(({ key }) => key === "B")

    expect(a?.currentValue).toBe("a-own")
    expect(a?.currentValue).not.toBe("b-current")
    expect(b?.currentValue).toBe("b-current")
  })

  test("parents pass through untouched, by reference", () => {
    const parents = [collectionVar("A", "resolved-upstream")]
    const result = resolveInheritedVariables(
      parents,
      [collectionVar("B")],
      "coll-x"
    )

    expect(result[0]).toBe(parents[0])
  })
})

describe("populateValuesInInheritedCollectionVars", () => {
  test("returns [] without an owning collection ID", () => {
    expect(
      populateValuesInInheritedCollectionVars([collectionVar("A")], undefined)
    ).toEqual([])
  })

  test("falls back to the variable's own currentValue when nothing is stored", () => {
    expect(
      populateValuesInInheritedCollectionVars(
        [collectionVar("A", "fallback")],
        "coll-empty"
      )
    ).toEqual([expect.objectContaining({ key: "A", currentValue: "fallback" })])
  })

  // Team collections store client-local values under the server `id`, while
  // the fetched tree regenerates `_ref_id` on every load.
  test("resolves via the server-id fallback when the primary ref misses (team key scheme)", () => {
    currentValues.addEnvironment("server-id-1", [
      { key: "T", currentValue: "team-CURRENT", varIndex: 0, isSecret: false },
    ])

    expect(
      populateValuesInInheritedCollectionVars(
        [collectionVar("T")],
        "coll_regenerated_random_ref", // fresh _ref_id: no stored entries
        "server-id-1"
      )
    ).toEqual([
      expect.objectContaining({ key: "T", currentValue: "team-CURRENT" }),
    ])
  })

  test("the primary key wins over the fallback when both have entries", () => {
    currentValues.addEnvironment("primary-ref", [
      {
        key: "P",
        currentValue: "primary-CURRENT",
        varIndex: 0,
        isSecret: false,
      },
    ])
    currentValues.addEnvironment("fallback-id", [
      {
        key: "P",
        currentValue: "fallback-CURRENT",
        varIndex: 0,
        isSecret: false,
      },
    ])

    expect(
      populateValuesInInheritedCollectionVars(
        [collectionVar("P")],
        "primary-ref",
        "fallback-id"
      )
    ).toEqual([
      expect.objectContaining({ key: "P", currentValue: "primary-CURRENT" }),
    ])
  })
})

// Secret values are stored in SecretEnvironmentService, NOT
// CurrentValueService — without `showSecret` the lookup reads the wrong store
// and secrets silently resolve to "" in the runner.
describe("populateValuesInInheritedCollectionVars — secret variables", () => {
  test("resolves a secret's value from SecretEnvironmentService when showSecret is true", () => {
    secretEnvs.addSecretEnvironment("sec-coll", [
      storedSecret("TOKEN", "s3cret-CURRENT", 0),
    ])

    expect(
      populateValuesInInheritedCollectionVars(
        [secretCollectionVar("TOKEN")],
        "sec-coll",
        undefined,
        true
      )
    ).toEqual([
      expect.objectContaining({ key: "TOKEN", currentValue: "s3cret-CURRENT" }),
    ])
  })

  test("resolves a secret via the server-id fallback when the primary ref misses (team key scheme)", () => {
    secretEnvs.addSecretEnvironment("sec-srv-1", [
      storedSecret("TEAM_TOKEN", "team-s3cret", 0),
    ])

    expect(
      populateValuesInInheritedCollectionVars(
        [secretCollectionVar("TEAM_TOKEN")],
        "sec_regenerated_random_ref", // fresh _ref_id: no stored entries
        "sec-srv-1",
        true
      )
    ).toEqual([
      expect.objectContaining({
        key: "TEAM_TOKEN",
        currentValue: "team-s3cret",
      }),
    ])
  })

  test("keeps a secret masked (empty) when showSecret is false — the default", () => {
    secretEnvs.addSecretEnvironment("sec-masked", [
      storedSecret("TOKEN", "must-not-appear", 0),
    ])

    expect(
      populateValuesInInheritedCollectionVars(
        [secretCollectionVar("TOKEN")],
        "sec-masked"
      )
    ).toEqual([expect.objectContaining({ key: "TOKEN", currentValue: "" })])
  })

  // Both stores key by the variable's index in the FULL variable list, so a
  // secret sitting after a non-secret must read its own slot in each store.
  test("mixed secret and non-secret variables each resolve from their own store", () => {
    currentValues.addEnvironment("sec-mixed", [
      stored("plain", "plain-CURRENT", 0),
    ])
    secretEnvs.addSecretEnvironment("sec-mixed", [
      storedSecret("TOKEN", "mixed-s3cret", 1),
    ])

    expect(
      populateValuesInInheritedCollectionVars(
        [collectionVar("plain"), secretCollectionVar("TOKEN")],
        "sec-mixed",
        undefined,
        true
      )
    ).toEqual([
      expect.objectContaining({ key: "plain", currentValue: "plain-CURRENT" }),
      expect.objectContaining({ key: "TOKEN", currentValue: "mixed-s3cret" }),
    ])
  })
})

describe("resolveInheritedVariables — secret variables", () => {
  test("threads showSecret through to the own-level resolution", () => {
    secretEnvs.addSecretEnvironment("sec-own", [
      storedSecret("OWN_TOKEN", "own-s3cret", 0),
    ])

    const resolved = resolveInheritedVariables(
      [collectionVar("A", "resolved-upstream")],
      [secretCollectionVar("OWN_TOKEN")],
      "sec-own",
      undefined,
      true
    )

    expect(resolved).toEqual([
      expect.objectContaining({ key: "A", currentValue: "resolved-upstream" }),
      expect.objectContaining({
        key: "OWN_TOKEN",
        currentValue: "own-s3cret",
      }),
    ])
  })

  test("defaults to masked secrets when showSecret is omitted", () => {
    secretEnvs.addSecretEnvironment("sec-default", [
      storedSecret("TOKEN", "must-not-appear", 0),
    ])

    const resolved = resolveInheritedVariables(
      [],
      [secretCollectionVar("TOKEN")],
      "sec-default"
    )

    expect(resolved).toEqual([
      expect.objectContaining({ key: "TOKEN", currentValue: "" }),
    ])
  })
})
