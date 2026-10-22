import { describe, expect, test } from "vitest"
import { stripIterationVarsFromEnvs } from "../iteration-vars"

const v = (key: string, value: string) => ({
  key,
  currentValue: value,
  initialValue: value,
  secret: false,
})

const keys = (...names: string[]) => new Set(names)

const selectedOf = (result: { selected: { key: string }[] }) =>
  result.selected.map(({ key, ...rest }) => [
    key,
    (rest as { currentValue: string }).currentValue,
  ])

describe("stripIterationVarsFromEnvs", () => {
  test("returns the envs untouched when no iteration keys were injected", () => {
    const envs = { global: [v("g", "1")], selected: [v("a", "1")] }
    expect(stripIterationVarsFromEnvs(envs, new Set(), [v("a", "0")])).toBe(
      envs
    )
  })

  test("restores a shadowed env var and drops an unshadowed injected key", () => {
    const initial = [v("token", "real"), v("host", "prod")]
    // Injected: token (shadows) and userId (new). Post-script selected carries
    // the injected values first, then the initial scope.
    const envs = {
      global: [],
      selected: [
        v("token", "row-token"),
        v("userId", "42"),
        v("token", "real"),
        v("host", "prod"),
      ],
    }

    const result = stripIterationVarsFromEnvs(
      envs,
      keys("token", "userId"),
      initial
    )

    expect(selectedOf(result)).toEqual([
      ["token", "real"],
      ["host", "prod"],
    ])
  })

  test("keeps a script update to a non-iteration key, at its original position", () => {
    const initial = [v("a", "1"), v("b", "2")]
    const envs = {
      global: [],
      selected: [v("col", "row"), v("a", "1"), v("b", "scripted")],
    }

    const result = stripIterationVarsFromEnvs(envs, keys("col"), initial)

    expect(selectedOf(result)).toEqual([
      ["a", "1"],
      ["b", "scripted"],
    ])
  })

  test("a script deletion of a non-iteration key stays deleted", () => {
    const initial = [v("a", "1"), v("b", "2")]
    const envs = { global: [], selected: [v("col", "row"), v("b", "2")] }

    const result = stripIterationVarsFromEnvs(envs, keys("col"), initial)

    expect(selectedOf(result)).toEqual([["b", "2"]])
  })

  test("script-added keys append after the initial scope", () => {
    const initial = [v("a", "1")]
    const envs = {
      global: [],
      selected: [v("col", "row"), v("a", "1"), v("added", "new")],
    }

    const result = stripIterationVarsFromEnvs(envs, keys("col"), initial)

    expect(selectedOf(result)).toEqual([
      ["a", "1"],
      ["added", "new"],
    ])
  })

  test("does not collapse duplicate non-iteration keys onto one entry", () => {
    // The env editor allows the same key on several rows; a flat last-wins
    // lookup would collapse [A:"1", A:"2"] into [A:"2", A:"2"].
    const initial = [v("A", "1"), v("A", "2"), v("b", "x")]
    const envs = {
      global: [],
      selected: [v("col", "row"), v("A", "1"), v("A", "2"), v("b", "x")],
    }

    const result = stripIterationVarsFromEnvs(envs, keys("col"), initial)

    expect(selectedOf(result)).toEqual([
      ["A", "1"],
      ["A", "2"],
      ["b", "x"],
    ])
  })

  test("pairs duplicate keys by occurrence when a script updates the first", () => {
    const initial = [v("A", "1"), v("A", "2")]
    // Sandbox setEnv mutates the first matching occurrence in place.
    const envs = {
      global: [],
      selected: [v("col", "row"), v("A", "9"), v("A", "2")],
    }

    const result = stripIterationVarsFromEnvs(envs, keys("col"), initial)

    expect(selectedOf(result)).toEqual([
      ["A", "9"],
      ["A", "2"],
    ])
  })

  test("passes global through untouched", () => {
    const globalVars = [v("col", "script-wrote-this")]
    const result = stripIterationVarsFromEnvs(
      { global: globalVars, selected: [v("col", "row")] },
      keys("col"),
      []
    )

    expect(result.global).toBe(globalVars)
    expect(result.selected).toEqual([])
  })
})
