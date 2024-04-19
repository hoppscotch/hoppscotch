import { preventCyclicObjects } from "~/shared-utils"

import { describe, expect, test } from "vitest"

describe("preventCyclicObjects", () => {
  test("succeeds with a simple object", () => {
    const testObj = {
      a: 1,
    }

    expect(preventCyclicObjects(testObj)).toBeRight()
  })

  test("fails with a cyclic object", () => {
    const testObj = {
      a: 1,
      b: null as any,
    }

    testObj.b = testObj

    expect(preventCyclicObjects(testObj)).toBeLeft()
  })
})
