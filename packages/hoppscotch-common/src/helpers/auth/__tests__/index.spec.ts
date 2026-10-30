import { beforeEach, describe, expect, test, vi } from "vitest"
import { AggregateEnvironment } from "~/newstore/environments"

const state = vi.hoisted(() => ({
  activeDocument: { type: "test" } as any,
  aggregateEnvs: [] as any[],
}))

vi.mock("~/modules/dioc", () => ({
  getService: () => ({
    currentActiveTab: {
      get value() {
        return { document: state.activeDocument }
      },
    },
  }),
}))
vi.mock("~/services/tab/workspace-tabs", () => ({
  WorkspaceTabsService: class {},
}))
vi.mock("~/newstore/environments", () => ({
  getAggregateEnvsWithCurrentValue: () => state.aggregateEnvs,
}))

import {
  replaceTemplateString,
  replaceTemplateStringsInObjectValues,
} from "../index"

const env = (
  key: string,
  value: string,
  sourceEnv = "Test Env"
): AggregateEnvironment => ({
  key,
  currentValue: value,
  initialValue: value,
  secret: false,
  sourceEnv,
})

describe("replaceTemplateStringsInObjectValues", () => {
  beforeEach(() => {
    state.activeDocument = { type: "test" }
    state.aggregateEnvs = [env("client_id", "from-env")]
  })

  test("resolves environment variables when no tab-scoped variables exist", () => {
    expect(replaceTemplateStringsInObjectValues({ a: "<<client_id>>" }).a).toBe(
      "from-env"
    )
  })

  test("resolves the supplied collection variables when the active tab is unrelated", () => {
    const collectionVars = [
      env("client_secret", "coll-secret", "CollectionVariable"),
      ...state.aggregateEnvs,
    ]

    expect(
      replaceTemplateStringsInObjectValues(
        { secret: "<<client_secret>>", id: "<<client_id>>" },
        "REST",
        collectionVars
      )
    ).toEqual({ secret: "coll-secret", id: "from-env" })
  })

  test("supplied variables keep collection > environment precedence", () => {
    const vars = [
      env("client_id", "from-collection", "CollectionVariable"),
      ...state.aggregateEnvs,
    ]
    expect(replaceTemplateString("<<client_id>>", vars)).toBe("from-collection")
  })
})
