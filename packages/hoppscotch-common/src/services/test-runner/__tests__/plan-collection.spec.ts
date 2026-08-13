import { describe, expect, test, vi } from "vitest"

// RequestRunner drags in the network/kernel stack; the plan walk never
// touches it.
vi.mock("~/helpers/RequestRunner", () => ({
  captureInitialEnvironmentState: vi.fn(),
  runTestRunnerRequest: vi.fn(),
}))

import { getService } from "~/modules/dioc"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { TestRunnerService } from "../test-runner.service"

const currentValues = getService(CurrentValueService)
const service = getService(TestRunnerService)

const planCollection = (collection: unknown, parentVariables: unknown[] = []) =>
  (service as any).planCollection(
    collection,
    new Set<string>(),
    false,
    [],
    [],
    undefined,
    undefined,
    parentVariables
  )

const collectionVar = (key: string, currentValue = "") => ({
  key,
  currentValue,
  initialValue: "",
  secret: false,
})

const request = (name: string) => ({
  name,
  _ref_id: `req-${name}`,
  method: "GET",
  endpoint: "https://example.com",
  headers: [],
  params: [],
  auth: { authType: "inherit", authActive: true },
  preRequestScript: "",
  testScript: "",
})

const node = (
  ids: { refId?: string; id?: string },
  variables: ReturnType<typeof collectionVar>[],
  requests: ReturnType<typeof request>[] = [],
  folders: unknown[] = []
) => ({
  v: 12,
  _ref_id: ids.refId,
  id: ids.id,
  name: ids.refId ?? ids.id ?? "node",
  folders,
  requests,
  headers: [],
  variables,
  auth: { authType: "inherit", authActive: true },
  preRequestScript: "",
  testScript: "",
})

const stored = (key: string, currentValue: string, varIndex: number) => ({
  key,
  currentValue,
  varIndex,
  isSecret: false,
})

describe("TestRunnerService.planCollection — inherited variable resolution", () => {
  test("resolves each level's own variables under that level's ID", () => {
    currentValues.addEnvironment("plan-c", [stored("A", "a-current", 0)])
    currentValues.addEnvironment("plan-f", [stored("B", "b-current", 0)])

    const tree = node(
      { refId: "plan-c" },
      [collectionVar("A")],
      [],
      [node({ refId: "plan-f" }, [collectionVar("B")], [request("leaf")])]
    )

    const [planned] = planCollection(tree)

    // The index-collision guard: A (owned by the root) must never read B's
    // storage slot at (plan-f, 0).
    expect(planned.inheritedVariables).toEqual([
      expect.objectContaining({ key: "A", currentValue: "a-current" }),
      expect.objectContaining({ key: "B", currentValue: "b-current" }),
    ])
  })

  test("falls back to the server id when _ref_id misses (team key scheme)", () => {
    currentValues.addEnvironment("srv-1", [stored("T", "team-current", 0)])

    const tree = node(
      { refId: "regenerated-on-fetch", id: "srv-1" },
      [collectionVar("T")],
      [request("team-leaf")]
    )

    const [planned] = planCollection(tree)

    expect(planned.inheritedVariables).toEqual([
      expect.objectContaining({ key: "T", currentValue: "team-current" }),
    ])
  })

  test("ancestor variables pass through pre-resolved; only the root's own raw list is resolved", () => {
    currentValues.addEnvironment("plan-root", [stored("own", "own-current", 0)])
    // A stored value under the root at the ancestor's merged index — the bug
    // shape: re-resolving a merged array under the root ID would hand this
    // value to the ancestor variable.
    const ancestor = {
      key: "anc",
      currentValue: "anc-RESOLVED-UPSTREAM",
      initialValue: "",
      secret: false,
    }

    const tree = node(
      { refId: "plan-root" },
      [collectionVar("own")],
      [request("root-leaf")]
    )

    const [planned] = planCollection(tree, [ancestor])

    expect(planned.inheritedVariables[0]).toBe(ancestor)
    expect(planned.inheritedVariables).toEqual([
      expect.objectContaining({
        key: "anc",
        currentValue: "anc-RESOLVED-UPSTREAM",
      }),
      expect.objectContaining({ key: "own", currentValue: "own-current" }),
    ])
  })
})
