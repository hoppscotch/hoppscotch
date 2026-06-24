import { describe, expect, test } from "vitest"
import { Environment, HoppRESTAuth } from "@hoppscotch/data"
import {
  getEffectiveVariablesForRequest,
  normalizeAggregateEnvs,
} from "../environments"
import { getComputedAuthHeaders } from "../EffectiveURL"
import { filterNonEmptyEnvironmentVariables } from "~/helpers/RequestRunner"
import { AggregateEnvironment } from "~/newstore/environments"
import { HoppInheritedProperty } from "../../types/HoppInheritedProperties"

// A request that inherits auth from a parent collection resolves `<<var>>` from
// three sources, highest precedence first:
//   request variable > collection variable > environment variable
// `getEffectiveVariablesForRequest` builds that ordered list; the preview and the
// request runner then pass it through `filterNonEmptyEnvironmentVariables`, so an
// empty high-precedence value falls through to a non-empty lower one.
// Tests use Basic auth with username "<<token>>", so the encoded header shows
// which source won.

const collectionAuth: HoppRESTAuth = {
  authType: "basic",
  authActive: true,
  username: "<<token>>",
  password: "pw",
}

const envVar = (key: string, value: string): AggregateEnvironment => ({
  key,
  currentValue: value,
  initialValue: value,
  secret: false,
  sourceEnv: "Test Env",
})

const collectionVar = (
  key: string,
  value: string
): HoppInheritedProperty["variables"] => [
  {
    parentID: "parent-coll",
    parentName: "Parent Coll",
    inheritedVariables: [
      { key, currentValue: value, initialValue: value, secret: false },
    ],
  },
]

// Pass auth via a request-like object so the context stays a real `{ auth, headers }`
// value — keeps working if an auth type starts reading the surrounding request.
const authHeaderFor = async (vars: Environment["variables"]) => {
  const headers = await getComputedAuthHeaders(vars, {
    auth: collectionAuth,
    headers: [],
  })
  return headers.find((h) => h.key === "Authorization")?.value
}

describe("getEffectiveVariablesForRequest", () => {
  test("orders sources request → collection → environment and drops inactive request vars", () => {
    const vars = getEffectiveVariablesForRequest(
      [
        { key: "a", value: "reqA", active: true },
        { key: "b", value: "reqB", active: false },
      ],
      collectionVar("c", "collC"),
      [envVar("d", "envD")]
    )

    expect(vars.map((v) => v.key)).toEqual(["a", "c", "d"])
    expect(vars[0]).toMatchObject({
      key: "a",
      currentValue: "reqA",
      initialValue: "reqA",
      sourceEnv: "RequestVariable",
      secret: false,
    })
  })

  test("treats undefined request and collection inputs as just the environment list", () => {
    const vars = getEffectiveVariablesForRequest(undefined, undefined, [
      envVar("d", "envD"),
    ])

    expect(vars).toEqual([
      expect.objectContaining({ key: "d", currentValue: "envD" }),
    ])
  })
})

describe("inherited collection auth — variable precedence in the preview", () => {
  test("request variable wins over collection and environment", async () => {
    const vars = getEffectiveVariablesForRequest(
      [{ key: "token", value: "request-token", active: true }],
      collectionVar("token", "coll-token"),
      [envVar("token", "env-token")]
    )

    expect(await authHeaderFor(vars)).toBe(`Basic ${btoa("request-token:pw")}`)
  })

  test("collection variable wins over environment", async () => {
    const vars = getEffectiveVariablesForRequest(
      [],
      collectionVar("token", "coll-token"),
      [envVar("token", "env-token")]
    )

    expect(await authHeaderFor(vars)).toBe(`Basic ${btoa("coll-token:pw")}`)
  })

  test("falls back to the environment variable when nothing else defines the key", async () => {
    const vars = getEffectiveVariablesForRequest(
      [],
      [],
      [envVar("token", "env-token")]
    )

    expect(await authHeaderFor(vars)).toBe(`Basic ${btoa("env-token:pw")}`)
  })

  test("raw list: an empty request variable still shadows the env var (first match wins)", async () => {
    const vars = getEffectiveVariablesForRequest(
      [{ key: "token", value: "", active: true }],
      [],
      [envVar("token", "env-token")]
    )

    expect(await authHeaderFor(vars)).toBe(`Basic ${btoa(":pw")}`)
  })

  test("filtered list: the empty request variable falls through to the env var (matches runtime)", async () => {
    const vars = filterNonEmptyEnvironmentVariables(
      getEffectiveVariablesForRequest(
        [{ key: "token", value: "", active: true }],
        [],
        [envVar("token", "env-token")]
      )
    )

    expect(await authHeaderFor(vars)).toBe(`Basic ${btoa("env-token:pw")}`)
  })
})

describe("normalizeAggregateEnvs (legacy { key, value } rows)", () => {
  test("fills currentValue/initialValue from a legacy `value`, leaving v2 rows intact", () => {
    const [normalized] = normalizeAggregateEnvs([
      {
        key: "token",
        value: "legacy",
        secret: false,
        sourceEnv: "RequestVariable",
      },
    ])
    expect(normalized).toMatchObject({
      key: "token",
      currentValue: "legacy",
      initialValue: "legacy",
    })

    const v2 = envVar("env", "v2-val")
    expect(normalizeAggregateEnvs([v2])[0]).toMatchObject(v2)
  })

  test("a normalized legacy row resolves in computed auth instead of empty", async () => {
    const legacy = [
      {
        key: "token",
        value: "legacy-token",
        secret: false,
        sourceEnv: "RequestVariable",
      },
    ]
    expect(await authHeaderFor(normalizeAggregateEnvs(legacy))).toBe(
      `Basic ${btoa("legacy-token:pw")}`
    )
  })
})
