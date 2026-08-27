import { afterEach, describe, expect, test, vi } from "vitest"

// RequestRunner drags in the network/kernel stack; the plan walk never
// touches it. `executedResponses$` must exist on the mock — newstore/history
// subscribes to it at module load.
vi.mock("~/helpers/RequestRunner", () => ({
  captureInitialEnvironmentState: vi.fn(),
  runTestRunnerRequest: vi.fn(),
  executedResponses$: { subscribe: vi.fn() },
}))

import { getService } from "~/modules/dioc"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { TestRunnerService } from "../test-runner.service"

const currentValues = getService(CurrentValueService)
const secretEnvs = getService(SecretEnvironmentService)
const service = getService(TestRunnerService)

// The value stores are module-scoped singletons — drop everything a test
// stored so no state leaks into the next one.
afterEach(() => {
  currentValues.environments.clear()
  secretEnvs.secretEnvironments.clear()
})

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

const gqlRequest = (name: string) => ({
  v: 10,
  name,
  _ref_id: `gql-${name}`,
  url: "https://example.com/graphql",
  query: "query { hello }",
  variables: "{}",
  headers: [
    {
      key: "X-Own",
      value: "own",
      active: true,
      description: "",
    },
  ],
  auth: { authType: "inherit", authActive: true },
  description: null,
  responses: {},
  preRequestScript: "",
  testScript: "",
})

const header = (key: string, value: string) => ({
  key,
  value,
  active: true,
  description: "",
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

  // Secret values live in SecretEnvironmentService, not CurrentValueService;
  // the plan walk must resolve them (showSecret) or every secret collection
  // variable executes as "".
  test("resolves secret variables from SecretEnvironmentService", () => {
    secretEnvs.addSecretEnvironment("plan-sec", [
      { key: "TOKEN", value: "plan-s3cret", varIndex: 1 },
    ])
    currentValues.addEnvironment("plan-sec", [
      stored("plain", "plain-current", 0),
    ])

    const tree = node(
      { refId: "plan-sec" },
      [
        collectionVar("plain"),
        { key: "TOKEN", currentValue: "", initialValue: "", secret: true },
      ],
      [request("secret-leaf")]
    )

    const [planned] = planCollection(tree)

    expect(planned.inheritedVariables).toEqual([
      expect.objectContaining({ key: "plain", currentValue: "plain-current" }),
      expect.objectContaining({ key: "TOKEN", currentValue: "plan-s3cret" }),
    ])
  })

  test("resolves secret variables via the server-id fallback (team key scheme)", () => {
    secretEnvs.addSecretEnvironment("srv-sec-1", [
      { key: "TEAM_TOKEN", value: "team-s3cret", varIndex: 0 },
    ])

    const tree = node(
      { refId: "regenerated-on-fetch-sec", id: "srv-sec-1" },
      [{ key: "TEAM_TOKEN", currentValue: "", initialValue: "", secret: true }],
      [request("team-secret-leaf")]
    )

    const [planned] = planCollection(tree)

    expect(planned.inheritedVariables).toEqual([
      expect.objectContaining({
        key: "TEAM_TOKEN",
        currentValue: "team-s3cret",
      }),
    ])
  })
})

describe("TestRunnerService.planCollection — GQL requests in unified collections", () => {
  const planWithHeaders = (collection: unknown, parentHeaders: unknown[]) =>
    (service as any).planCollection(
      collection,
      new Set<string>(),
      false,
      [],
      [],
      parentHeaders,
      undefined,
      []
    )

  test("GQL entries keep their own headers unmerged; REST siblings get inherited headers pre-merged", () => {
    const tree = node(
      { refId: "plan-gql" },
      [],
      [request("rest-leaf"), gqlRequest("gql-leaf") as any]
    )
    tree.headers = [header("X-Coll", "coll")] as any

    const planned = planWithHeaders(tree, [header("X-Parent", "parent")])
    expect(planned).toHaveLength(2)

    const [rest, gql] = planned

    // REST executor expects inherited headers pre-merged into the request
    expect(rest.request.headers.map((h: any) => h.key)).toEqual([
      "X-Parent",
      "X-Coll",
    ])

    // GQL executor slots auth headers between request and inherited headers
    // itself — the planned request must carry ONLY its own headers, with the
    // inherited ones threaded separately on the entry
    expect(gql.request.headers.map((h: any) => h.key)).toEqual(["X-Own"])
    expect(gql.inheritedHeaders.map((h: any) => h.key)).toEqual([
      "X-Parent",
      "X-Coll",
    ])
  })

  test("GQL auth: inherit resolves to the collection's effective auth", () => {
    const tree = node(
      { refId: "plan-gql-auth" },
      [],
      [gqlRequest("gql-auth-leaf") as any]
    )
    tree.auth = { authType: "basic", authActive: true } as any

    const [planned] = planCollection(tree)

    expect(planned.request.auth).toEqual({
      authType: "basic",
      authActive: true,
    })
  })

  test("selection IDs resolve for GQL rows via _ref_id", () => {
    const tree = node(
      { refId: "plan-gql-sel" },
      [],
      [request("rest-skip"), gqlRequest("gql-pick") as any]
    )

    const planned = (service as any).planCollection(
      tree,
      new Set<string>(["gql-gql-pick"]),
      true,
      [],
      [],
      undefined,
      undefined,
      []
    )

    expect(planned).toHaveLength(1)
    expect(planned[0].id).toBe("gql-gql-pick")
    expect(planned[0].request.name).toBe("gql-pick")
  })
})

describe("TestRunnerService.getTestResultInfo — pass/fail counting", () => {
  const count = (result: unknown) => (service as any).getTestResultInfo(result)

  test("counts error-status expectations as failures", () => {
    expect(
      count({
        expectResults: [
          { status: "pass", message: "" },
          { status: "fail", message: "" },
          { status: "error", message: "" },
        ],
        tests: [],
      })
    ).toEqual({ passed: 1, failed: 2 })
  })

  test("counts a script error as one failure", () => {
    expect(count({ scriptError: true, expectResults: [], tests: [] })).toEqual({
      passed: 0,
      failed: 1,
    })
  })

  test("accumulates nested test blocks", () => {
    expect(
      count({
        scriptError: false,
        expectResults: [{ status: "pass", message: "" }],
        tests: [
          {
            description: "",
            expectResults: [{ status: "error", message: "" }],
            tests: [],
          },
        ],
      })
    ).toEqual({ passed: 1, failed: 1 })
  })
})
