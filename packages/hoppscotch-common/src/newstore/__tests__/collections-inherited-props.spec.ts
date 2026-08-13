import { describe, expect, test, vi } from "vitest"

// newstore/collections sits on an import cycle (collections → services/tab/rest
// → services/persistence → collections); stub the cycle edge so the module
// loads under vitest.
vi.mock("~/services/tab/rest", () => ({
  RESTTabService: class MockRESTTabService {
    static ID = "REST_TAB_SERVICE"
  },
}))
vi.mock("~/modules/i18n", () => ({ getI18n: () => (k: string) => k }))

import { getService } from "~/modules/dioc"
import { CurrentValueService } from "~/services/current-environment-value.service"

const collectionVar = (key: string, initialValue: string) => ({
  key,
  initialValue,
  // Current values live in CurrentValueService, not on the collection JSON.
  currentValue: "",
  secret: false,
})

const node = (
  refId: string,
  name: string,
  variables: ReturnType<typeof collectionVar>[],
  folders: unknown[] = []
) => ({
  v: 12,
  _ref_id: refId,
  name,
  folders,
  requests: [],
  headers: [],
  variables,
  auth: { authType: "inherit", authActive: true },
  description: null,
  preRequestScript: "",
  testScript: "",
})

describe("getRESTCollectionInheritedProps — collection variable values", () => {
  test("resolves every ancestor level's CURRENT value, not just the top one", async () => {
    const { getRESTCollectionInheritedProps } = await import("../collections")

    const currentValues = getService(CurrentValueService)
    currentValues.addEnvironment("ref-root", [
      {
        key: "rootVar",
        currentValue: "root-CURRENT",
        varIndex: 0,
        isSecret: false,
      },
    ])
    currentValues.addEnvironment("ref-parent", [
      {
        key: "parentVar",
        currentValue: "parent-CURRENT",
        varIndex: 0,
        isSecret: false,
      },
    ])

    // root → parent folder → grandchild (the run target)
    const tree = node(
      "ref-root",
      "Root",
      [collectionVar("rootVar", "root-initial")],
      [
        node(
          "ref-parent",
          "Parent",
          [collectionVar("parentVar", "parent-initial")],
          [node("ref-child", "Child", [])]
        ),
      ]
    )

    const props = getRESTCollectionInheritedProps(
      "ref-child",
      [tree] as any,
      "my-collections"
    )

    expect(props).not.toBeNull()
    expect(props!.ancestorVariables).toEqual([
      expect.objectContaining({ key: "rootVar", currentValue: "root-CURRENT" }),
      expect.objectContaining({
        key: "parentVar",
        currentValue: "parent-CURRENT",
      }),
    ])
  })

  test("running a folder: ancestors resolved, own variables excluded from ancestors", async () => {
    const { getRESTCollectionInheritedProps } = await import("../collections")

    const currentValues = getService(CurrentValueService)
    currentValues.addEnvironment("ref-root2", [
      { key: "a", currentValue: "a-CURRENT", varIndex: 0, isSecret: false },
    ])
    currentValues.addEnvironment("ref-f2", [
      { key: "b", currentValue: "b-CURRENT", varIndex: 0, isSecret: false },
    ])

    const tree = node(
      "ref-root2",
      "Root",
      [collectionVar("a", "a-initial")],
      [node("ref-f2", "F", [collectionVar("b", "b-initial")])]
    )

    const props = getRESTCollectionInheritedProps(
      "ref-f2",
      [tree] as any,
      "my-collections"
    )

    expect(props!.ancestorVariables).toEqual([
      expect.objectContaining({ key: "a", currentValue: "a-CURRENT" }),
    ])
    // The merged view still resolves the folder's own current value too.
    expect(props!.variables).toEqual([
      expect.objectContaining({ key: "a", currentValue: "a-CURRENT" }),
      expect.objectContaining({ key: "b", currentValue: "b-CURRENT" }),
    ])
  })

  test("running the root: no ancestors", async () => {
    const { getRESTCollectionInheritedProps } = await import("../collections")
    const tree = node("ref-solo", "Solo", [collectionVar("x", "x-initial")])
    const props = getRESTCollectionInheritedProps(
      "ref-solo",
      [tree] as any,
      "my-collections"
    )
    expect(props!.ancestorVariables).toEqual([])
  })
})
