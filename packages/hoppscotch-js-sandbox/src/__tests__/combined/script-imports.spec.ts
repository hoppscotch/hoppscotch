import { describe, expect, test } from "vitest"
import { combineScriptsWithIIFE } from "~/utils/scripting"
import { runPreRequest, runTestAndGetEnvs } from "~/utils/test-helpers"

const envs = { global: [], selected: [] }

describe("script ESM imports — pre-request scripts", () => {
  test("named import binding is reachable from the script body", async () => {
    const script = combineScriptsWithIIFE([
      `import { value } from "data:text/javascript,export const value = 'esm-ok'";\npw.env.set("IMPORTED_VALUE", value);`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeRight()
    if (result._tag === "Right") {
      const updated = result.right.selected.find(
        (v) => v.key === "IMPORTED_VALUE"
      )
      expect(updated?.currentValue).toBe("esm-ok")
    }
  })

  test("default import binding is reachable from the script body", async () => {
    const script = combineScriptsWithIIFE([
      `import obj from "data:text/javascript,export default { greet: 'hi' }";\npw.env.set("GREETING", obj.greet);`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeRight()
    if (result._tag === "Right") {
      const updated = result.right.selected.find((v) => v.key === "GREETING")
      expect(updated?.currentValue).toBe("hi")
    }
  })

  test("multiple imports across cascade reach the consuming script body", async () => {
    const script = combineScriptsWithIIFE([
      `import { rootVal } from "data:text/javascript,export const rootVal = 1";`,
      `import { folderVal } from "data:text/javascript,export const folderVal = 2";`,
      `import { reqVal } from "data:text/javascript,export const reqVal = 3";\npw.env.set("SUM", String(rootVal + folderVal + reqVal));`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeRight()
    if (result._tag === "Right") {
      const updated = result.right.selected.find((v) => v.key === "SUM")
      expect(updated?.currentValue).toBe("6")
    }
  })

  test("namespace import binding is reachable from the script body", async () => {
    const script = combineScriptsWithIIFE([
      `import * as ns from "data:text/javascript,export const a = 1; export const b = 2";\npw.env.set("NS_SUM", String(ns.a + ns.b));`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeRight()
    if (result._tag === "Right") {
      const updated = result.right.selected.find((v) => v.key === "NS_SUM")
      expect(updated?.currentValue).toBe("3")
    }
  })

  test("mixed default + named imports resolve from one source", async () => {
    const script = combineScriptsWithIIFE([
      `import obj, { extra } from "data:text/javascript,export default { v: 7 }; export const extra = 5";\npw.env.set("MIXED", String(obj.v + extra));`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeRight()
    if (result._tag === "Right") {
      const updated = result.right.selected.find((v) => v.key === "MIXED")
      expect(updated?.currentValue).toBe("12")
    }
  })

  test("duplicate import bindings across scripts surface a SyntaxError", async () => {
    const script = combineScriptsWithIIFE([
      `import dup from "data:text/javascript,export default 1";`,
      `import dup from "data:text/javascript,export default 2";\npw.env.set("SHOULD_NOT_RUN", "yes");`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeLeft()
    if (result._tag === "Left") {
      expect(result.left).toMatch(
        /'dup' is imported by multiple scripts in this request's chain/
      )
    }
  })
})

describe("script ESM imports — test scripts", () => {
  test("named import binding resolves in test script", async () => {
    const script = combineScriptsWithIIFE([
      `import { value } from "data:text/javascript,export const value = 'test-esm-ok'";\npw.env.set("IMPORTED_VALUE", value);`,
    ])

    const result = await runTestAndGetEnvs(script, envs)()

    expect(result).toBeRight()
    if (result._tag === "Right") {
      const updated = result.right.selected.find(
        (v) => v.key === "IMPORTED_VALUE"
      )
      expect(updated?.currentValue).toBe("test-esm-ok")
    }
  })

  test("default import binding resolves in test script", async () => {
    const script = combineScriptsWithIIFE([
      `import obj from "data:text/javascript,export default { greet: 'hello-test' }";\npw.env.set("GREETING", obj.greet);`,
    ])

    const result = await runTestAndGetEnvs(script, envs)()

    expect(result).toBeRight()
    if (result._tag === "Right") {
      const updated = result.right.selected.find((v) => v.key === "GREETING")
      expect(updated?.currentValue).toBe("hello-test")
    }
  })

  test("malformed test script surfaces a friendly SyntaxError pre-cage", async () => {
    const result = await runTestAndGetEnvs("const x = ;", envs)()

    expect(result).toBeLeft()
    if (result._tag === "Left") {
      expect(result.left).toMatch(/Script execution failed:.*SyntaxError/)
    }
  })
})

// Live network coverage against esm.sh — opt-in to keep CI deterministic.
// Run locally with `HOPP_NETWORK_TESTS=1 pnpm --filter @hoppscotch/js-sandbox test`.
const networkTest = process.env.HOPP_NETWORK_TESTS === "1" ? test : test.skip

describe("script ESM imports — live esm.sh (opt-in)", () => {
  networkTest(
    "lodash + axios + date-fns import shape from RFC #5221 resolves",
    async () => {
      const script = combineScriptsWithIIFE([
        [
          `import lodash from "https://esm.sh/lodash@4.17.21";`,
          `import axios from "https://esm.sh/axios@1.6.0";`,
          `import { format } from "https://esm.sh/date-fns@2.30.0";`,
          `pw.env.set("PICKED", JSON.stringify(lodash.pick({ a: 1, b: 2 }, ["a"])));`,
          `pw.env.set("AXIOS_TYPE", typeof axios);`,
          `pw.env.set("FORMATTED", format(new Date(2026, 4, 7), "yyyy-MM-dd"));`,
        ].join("\n"),
      ])

      const result = await runTestAndGetEnvs(script, envs)()

      expect(result).toBeRight()
      if (result._tag === "Right") {
        const picked = result.right.selected.find((v) => v.key === "PICKED")
        const axiosType = result.right.selected.find(
          (v) => v.key === "AXIOS_TYPE"
        )
        const formatted = result.right.selected.find(
          (v) => v.key === "FORMATTED"
        )
        expect(picked?.currentValue).toBe(JSON.stringify({ a: 1 }))
        expect(axiosType?.currentValue).toMatch(/object|function/)
        expect(formatted?.currentValue).toBe("2026-05-07")
      }
    },
    30_000
  )
})
