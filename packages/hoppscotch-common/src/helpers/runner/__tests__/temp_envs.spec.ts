import { describe, expect, test } from "vitest"
import { filterNonEmptyEnvironmentVariables } from "~/helpers/utils/environments"
import { scriptEnvsToTemporaryVariables } from "../temp_envs"

const v = (key: string, value: string) => ({
  key,
  currentValue: value,
  initialValue: value,
  secret: false,
})

describe("scriptEnvsToTemporaryVariables", () => {
  test("orders selected before global", () => {
    const result = scriptEnvsToTemporaryVariables({
      global: [v("G", "g"), v("K", "global")],
      selected: [v("K", "selected"), v("S", "s")],
    })

    expect(result.map(({ key }) => key)).toEqual(["K", "S", "G", "K"])
    expect(result[0]).toEqual(
      expect.objectContaining({ key: "K", currentValue: "selected" })
    )
  })

  // A key present in BOTH scopes must resolve to the same value on every
  // request: request 1 resolves with an empty temp store, request 2+ through
  // the temp store written from the previous request's script envs.
  test("keeps a both-scopes key resolving to its selected value across requests", () => {
    const selected = [v("K", "selected-value")]
    const global = [v("K", "global-value")]

    const resolveRequest = (
      temp: ReturnType<typeof scriptEnvsToTemporaryVariables>
    ) =>
      filterNonEmptyEnvironmentVariables([
        ...temp,
        ...selected,
        ...global,
      ]).find(({ key }) => key === "K")

    // Request 1: no temp store yet.
    const request1 = resolveRequest([])
    // Request 2+: temp store carries the previous request's script envs.
    const request2 = resolveRequest(
      scriptEnvsToTemporaryVariables({ global, selected })
    )

    expect(request1?.currentValue).toBe("selected-value")
    expect(request2?.currentValue).toBe("selected-value")
  })
})
