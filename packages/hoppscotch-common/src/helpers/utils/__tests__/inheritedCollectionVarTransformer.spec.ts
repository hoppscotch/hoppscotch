import { describe, expect, test } from "vitest"
import { getService } from "~/modules/dioc"
import { CurrentValueService } from "~/services/current-environment-value.service"
import {
  populateValuesInInheritedCollectionVars,
  resolveInheritedVariables,
} from "../inheritedCollectionVarTransformer"

const currentValues = getService(CurrentValueService)

const collectionVar = (key: string, currentValue = "") => ({
  key,
  currentValue,
  initialValue: "",
  secret: false,
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
    currentValues.deleteEnvironment("coll-c")
    currentValues.deleteEnvironment("coll-f")
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
    currentValues.deleteEnvironment("coll-empty")

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
