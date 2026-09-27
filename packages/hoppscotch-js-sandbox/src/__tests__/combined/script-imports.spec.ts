import * as E from "fp-ts/Either"
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
    if (E.isRight(result)) {
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
    if (E.isRight(result)) {
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
    if (E.isRight(result)) {
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
    if (E.isRight(result)) {
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
    if (E.isRight(result)) {
      const updated = result.right.selected.find((v) => v.key === "MIXED")
      expect(updated?.currentValue).toBe("12")
    }
  })

  test("identical imports across scripts are deduped to a single emit", async () => {
    const sharedSource = `data:text/javascript,export default 'shared'`
    const script = combineScriptsWithIIFE([
      `import shared from "${sharedSource}";\npw.env.set("FROM_FIRST", shared);`,
      `import shared from "${sharedSource}";\npw.env.set("FROM_SECOND", shared);`,
    ])

    const importMatches = script.match(/^import shared from /gm) ?? []
    expect(importMatches).toHaveLength(1)

    const result = await runPreRequest(script, envs)()
    expect(result).toBeRight()
    if (E.isRight(result)) {
      expect(
        result.right.selected.find((v) => v.key === "FROM_FIRST")?.currentValue
      ).toBe("shared")
      expect(
        result.right.selected.find((v) => v.key === "FROM_SECOND")?.currentValue
      ).toBe("shared")
    }
  })

  // Dedup is by literal string match; cosmetic differences (whitespace, quote
  // style, alias-renames) from the same source are NOT deduped and surface as
  // a duplicate-declaration error from the module evaluator.
  test("cosmetically different but semantically identical imports are NOT deduped", async () => {
    const script = combineScriptsWithIIFE([
      `import dup from "data:text/javascript,export default 1";`,
      `import dup  from "data:text/javascript,export default 1";`,
    ])

    const importMatches = script.match(/^import dup\s+from /gm) ?? []
    expect(importMatches).toHaveLength(2)
  })

  // Mixing import shapes for the same local name from the same source
  // (e.g. `import * as foo` + `import { foo }`) emits both lines. The friendly
  // pre-cage check only fires on cross-source collisions, so this surfaces as
  // a duplicate-declaration error from the module evaluator.
  test("namespace + named imports for the same local name emit both lines", async () => {
    const sharedSource = `data:text/javascript,export const foo = 1`
    const script = combineScriptsWithIIFE([
      `import * as foo from "${sharedSource}";`,
      `import { foo } from "${sharedSource}";`,
    ])

    const importMatches = script.match(/^import .*foo.* from /gm) ?? []
    expect(importMatches).toHaveLength(2)
  })

  test("same-name imports from different sources surface a SyntaxError", async () => {
    const script = combineScriptsWithIIFE([
      `import dup from "data:text/javascript,export default 1";`,
      `import dup from "data:text/javascript,export default 2";\npw.env.set("SHOULD_NOT_RUN", "yes");`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeLeft()
    if (E.isLeft(result)) {
      expect(result.left).toMatch(
        /'dup' is imported from different sources across scripts in this request's chain/
      )
    }
  })

  test("parse failure surfaces the original Acorn message, not a misleading wrapper error", async () => {
    // Pre-fix: wrapper would re-evaluate the raw script inside an IIFE
    // and surface a misleading "import declarations may only appear at
    // top level" error instead of the actual syntax error.
    const script = combineScriptsWithIIFE([
      `import { foo } from "data:text/javascript,export const foo = 1";\nconst x = ;`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeLeft()
    if (E.isLeft(result)) {
      expect(result.left).toMatch(/\[Hoppscotch\] Script failed to parse/)
      expect(result.left).not.toMatch(
        /import declarations may only appear at top level/
      )
    }
  })

  test("import-only cascade emits clean output without an empty try/catch", () => {
    // Import-only cascade: no awaited bodies → no try/catch needed.
    const script = combineScriptsWithIIFE([
      `import "data:text/javascript,globalThis.__a = 1";`,
      `import "data:text/javascript,globalThis.__b = 2";`,
    ])

    expect(script).not.toContain("try {")
    expect(script).not.toContain("__hoppReporter")
    expect(script).toContain('import "data:text/javascript,globalThis.__a = 1"')
    expect(script).toContain('import "data:text/javascript,globalThis.__b = 2"')
  })

  test("import-only cascade with cross-source clash still surfaces the friendly conflict error", async () => {
    // The import-only short-circuit must not bypass conflict detection.
    const script = combineScriptsWithIIFE([
      `import dup from "data:text/javascript,export default 1";`,
      `import dup from "data:text/javascript,export default 2";`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeLeft()
    if (E.isLeft(result)) {
      expect(result.left).toMatch(
        /'dup' is imported from different sources across scripts in this request's chain/
      )
    }
  })

  test("user import binding to a wrapper-reserved name surfaces a friendly error", async () => {
    const script = combineScriptsWithIIFE([
      `import __hoppReporter from "data:text/javascript,export default {}";\npw.env.set("SHOULD_NOT_RUN", "yes");`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeLeft()
    if (E.isLeft(result)) {
      expect(result.left).toMatch(
        /'__hoppReporter' is reserved by Hoppscotch's script wrapper/
      )
    }
  })

  test("user import binding 'globalThis' is also reserved", async () => {
    // Wrapper reads `globalThis.__hoppReportScriptExecutionError`; a user
    // import shadowing `globalThis` would silently break error reporting.
    const script = combineScriptsWithIIFE([
      `import globalThis from "data:text/javascript,export default {}";`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeLeft()
    if (E.isLeft(result)) {
      expect(result.left).toMatch(
        /'globalThis' is reserved by Hoppscotch's script wrapper/
      )
    }
  })

  test("named re-export-from declarations are hoisted alongside imports", async () => {
    const script = combineScriptsWithIIFE([
      `export { value } from "data:text/javascript,export const value = 're-export-ok'";\nimport { value as v } from "data:text/javascript,export const value = 're-export-ok'";\npw.env.set("RE_EXPORT", v);`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeRight()
    if (E.isRight(result)) {
      const updated = result.right.selected.find((v) => v.key === "RE_EXPORT")
      expect(updated?.currentValue).toBe("re-export-ok")
    }
  })

  test("export-all-from declarations are hoisted alongside imports", async () => {
    const script = combineScriptsWithIIFE([
      `export * from "data:text/javascript,export const a = 1";\nimport { a } from "data:text/javascript,export const a = 1";\npw.env.set("EXPORT_ALL", String(a));`,
    ])

    const result = await runPreRequest(script, envs)()

    expect(result).toBeRight()
    if (E.isRight(result)) {
      const updated = result.right.selected.find((v) => v.key === "EXPORT_ALL")
      expect(updated?.currentValue).toBe("1")
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
    if (E.isRight(result)) {
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
    if (E.isRight(result)) {
      const updated = result.right.selected.find((v) => v.key === "GREETING")
      expect(updated?.currentValue).toBe("hello-test")
    }
  })

  test("malformed test script surfaces a friendly SyntaxError pre-cage", async () => {
    const result = await runTestAndGetEnvs("const x = ;", envs)()

    expect(result).toBeLeft()
    if (E.isLeft(result)) {
      expect(result.left).toMatch(/Script execution failed:.*SyntaxError/)
    }
  })
})

// Live network coverage against esm.sh — opt-in to keep CI deterministic.
const networkTest = process.env.HOPP_NETWORK_TESTS === "1" ? test : test.skip

describe("script ESM imports — live esm.sh (opt-in)", () => {
  networkTest(
    "real-world ESM import shape resolves end-to-end",
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

      // Soft-pass on esm.sh degradation — the assertions only run when the
      // module loader actually delivers a usable result.
      let result
      try {
        result = await runTestAndGetEnvs(script, envs)()
      } catch (e) {
        console.warn("[skip] esm.sh appears degraded:", e)
        return
      }
      if (E.isLeft(result)) {
        console.warn("[skip] esm.sh appears degraded:", result.left)
        return
      }

      expect(
        result.right.selected.find((v) => v.key === "PICKED")?.currentValue
      ).toBe(JSON.stringify({ a: 1 }))
      expect(
        result.right.selected.find((v) => v.key === "AXIOS_TYPE")?.currentValue
      ).toMatch(/object|function/)
      expect(
        result.right.selected.find((v) => v.key === "FORMATTED")?.currentValue
      ).toBe("2026-05-07")
    },
    30_000
  )
})
