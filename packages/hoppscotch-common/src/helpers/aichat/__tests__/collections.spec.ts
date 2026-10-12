import { describe, expect, test } from "vitest"
import type { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import {
  describeAmbiguous,
  findRequestInTree,
  findTopLevelCollection,
  lookupCollection,
  lookupRequest,
  pickByName,
} from "../collections"

const node = (
  name: string,
  folders: HoppCollection[] = [],
  requests: HoppCollection["requests"] = []
): HoppCollection =>
  ({
    v: 9,
    name,
    folders,
    requests,
    headers: [],
    auth: { authType: "inherit", authActive: true },
    variables: [],
  }) as unknown as HoppCollection

const req = (name: string, endpoint = "") =>
  ({ name, endpoint, method: "GET" }) as unknown as HoppRESTRequest

describe("lookupCollection", () => {
  const tree = [
    node("Users", [node("Auth", [node("Tokens")]), node("Profiles")]),
    node("Orders", [node("Auth")]),
    node("Billing", [node("v1")]),
    node("Payments", [node("v1")]),
  ]

  test("finds a unique name at any depth, with its path and label", () => {
    expect(lookupCollection(tree, "orders")).toMatchObject({
      found: { path: "1", label: "Orders" },
    })
    expect(lookupCollection(tree, "tokens")).toMatchObject({
      found: { path: "0/0/0", label: "Users/Auth/Tokens" },
    })
  })

  // Deleting "v1 under Billing" used to hit Payments' v1 or the first one found.
  test("reports a repeated name instead of picking one", () => {
    expect(lookupCollection(tree, "v1")).toEqual({
      ambiguous: ["Billing/v1", "Payments/v1"],
    })
    expect(lookupCollection(tree, "Auth")).toEqual({
      ambiguous: ["Users/Auth", "Orders/Auth"],
    })
  })

  test("a top-level collection no longer shadows a same-named folder", () => {
    const shadow = [node("Auth"), node("Users", [node("Auth")])]
    expect(lookupCollection(shadow, "Auth")).toEqual({
      ambiguous: ["Auth", "Users/Auth"],
    })
    // A leading slash anchors at the top level.
    expect(lookupCollection(shadow, "/Auth")).toMatchObject({
      found: { path: "0" },
    })
  })

  test("resolves a Parent/Child path", () => {
    expect(lookupCollection(tree, "Payments/v1")).toMatchObject({
      found: { path: "3/0", label: "Payments/v1" },
    })
    expect(lookupCollection(tree, " orders / auth ")).toMatchObject({
      found: { path: "1/0" },
    })
    expect(lookupCollection(tree, "/Users/Auth/Tokens")).toMatchObject({
      found: { path: "0/0/0" },
    })
  })

  test("an anchored path must start at the top level", () => {
    expect(lookupCollection(tree, "/Auth/Tokens")).toBeNull()
  })

  test("still finds a name that itself contains a slash", () => {
    const slashed = [node("users/v1"), node("Other")]
    expect(lookupCollection(slashed, "users/v1")).toMatchObject({
      found: { path: "0" },
    })
  })

  // The refusal lists "/API/v1/beta"; that path must resolve.
  test("the paths a slashed-name refusal lists resolve", () => {
    const tree = [
      node("API", [node("v1/beta")]),
      node("Web", [node("v1/beta")]),
    ]
    const lookup = lookupCollection(tree, "v1/beta")
    expect(lookup).toEqual({ ambiguous: ["API/v1/beta", "Web/v1/beta"] })
    expect(lookupCollection(tree, "/API/v1/beta")).toMatchObject({
      found: { path: "0/0" },
    })
    expect(lookupCollection(tree, "Web/v1/beta")).toMatchObject({
      found: { path: "1/0" },
    })
  })

  test("a bare name never matches part of a slashed one", () => {
    expect(lookupCollection([node("users/v1")], "v1")).toBeNull()
  })

  test("returns null for unknown or empty names", () => {
    expect(lookupCollection(tree, "Nope")).toBeNull()
    expect(lookupCollection(tree, "  ")).toBeNull()
    expect(lookupCollection(tree, "/")).toBeNull()
  })

  test("the ambiguity reply lists paths the model can pass back", () => {
    const reply = describeAmbiguous("collections", "v1", [
      "Billing/v1",
      "Payments/v1",
    ])
    expect(reply).toContain("/Billing/v1, /Payments/v1")
    expect(reply).not.toContain("rename")
    expect(describeAmbiguous("collections", "A", ["A", "A"])).toContain(
      "rename one first"
    )
  })
})

describe("findTopLevelCollection", () => {
  // create_collection used to add a second "Users" beside " Users ".
  test("ignores whitespace around the stored name", () => {
    const tree = [node("Orders"), node(" Users ")]
    expect(findTopLevelCollection(tree, "users")?.index).toBe(1)
    expect(findTopLevelCollection(tree, " ORDERS ")?.index).toBe(0)
  })

  test("matches only top-level names", () => {
    expect(findTopLevelCollection([node("A", [node("B")])], "B")).toBeNull()
  })
})

describe("request lookups", () => {
  const tree = [
    node(
      "Auth",
      [node("v2", [], [req("Login")])],
      [
        req("Login", "https://api.example/login"),
        req("Get users", "https://api.example/users"),
        req("Get user by id", "https://api.example/users/1"),
      ]
    ),
    node("Billing", [], [req("Login")]),
  ]

  // A write must not land on "Login" when asked for a request that doesn't exist.
  test("lookupRequest matches exact names only", () => {
    expect(lookupRequest(tree, "Login with refresh token", "Auth")).toBeNull()
    expect(lookupRequest(tree, "Get user", "Auth")).toBeNull()
    expect(lookupRequest(tree, "users/1", "Auth")).toBeNull()
    expect(lookupRequest(tree, "get users", "Auth")).toMatchObject({
      found: { folderPath: "0", requestIndex: 1, label: "Auth/Get users" },
    })
  })

  test("lookupRequest reports a name repeated in scope", () => {
    expect(lookupRequest(tree, "Login")).toEqual({
      ambiguous: ["Auth/Login", "Auth/v2/Login", "Billing/Login"],
    })
    expect(lookupRequest(tree, "Login", "Billing")).toMatchObject({
      found: { folderPath: "1", requestIndex: 0 },
    })
    expect(lookupRequest(tree, "Login", "Auth/v2")).toMatchObject({
      found: { folderPath: "0/0", requestIndex: 0 },
    })
  })

  test("findRequestInTree stays tolerant and accepts a path scope", () => {
    expect(findRequestInTree(tree, "Get user", "Auth")?.request.name).toBe(
      "Get users"
    )
    expect(findRequestInTree(tree, "login", "Auth/v2")).toMatchObject({
      folderPath: "0/0",
      requestIndex: 0,
    })
    expect(findRequestInTree(tree, "Login", "Nope")).toBeNull()
  })
})

describe("pickByName", () => {
  const envs = ["Preprod", "Production", "Staging"]
  const pick = (name: string) => pickByName(envs, name, (e) => e)

  test("an exact match wins over partial ones", () => {
    expect(pick("production")).toEqual({ item: "Production" })
  })

  test("a unique partial match is taken", () => {
    expect(pick("stag")).toEqual({ item: "Staging" })
  })

  // "prod" used to select Preprod just because it came first.
  test("several partial matches are reported, not guessed", () => {
    expect(pick("prod")).toEqual({ ambiguous: ["Preprod", "Production"] })
  })

  test("returns null for no match", () => {
    expect(pick("qa")).toBeNull()
    expect(pick(" ")).toBeNull()
  })
})
