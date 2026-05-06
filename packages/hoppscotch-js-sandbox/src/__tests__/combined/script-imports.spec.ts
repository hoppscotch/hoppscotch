import { describe, expect, test } from "vitest"
import { runPreRequest } from "~/utils/test-helpers"

// Tests inline the import-hoisted wrapper shape directly to avoid a
// cross-package import on `combineScriptsWithIIFE` from hoppscotch-common.
describe("script ESM imports", () => {
  const envs = { global: [], selected: [] }

  const wrapWithImports = (imports: string[], body: string): string => {
    const tryBlock = [
      "const __hoppReporter = globalThis.__hoppReportScriptExecutionError;",
      "try {",
      `await (async function() {\n${body}\n})();`,
      "} catch (__hoppScriptExecutionError) {",
      "  __hoppReporter(__hoppScriptExecutionError);",
      "}",
    ].join("\n")
    return imports.length > 0 ? [imports.join("\n"), tryBlock].join("\n") : tryBlock
  }

  test("named import binding is reachable from the script body", async () => {
    const script = wrapWithImports(
      [`import { value } from "data:text/javascript,export const value = 'esm-ok'";`],
      `pw.env.set("IMPORTED_VALUE", value);`
    )

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
    const script = wrapWithImports(
      [`import obj from "data:text/javascript,export default { greet: 'hi' }";`],
      `pw.env.set("GREETING", obj.greet);`
    )

    const result = await runPreRequest(script, envs)()

    expect(result).toBeRight()
    if (result._tag === "Right") {
      const updated = result.right.selected.find(
        (v) => v.key === "GREETING"
      )
      expect(updated?.currentValue).toBe("hi")
    }
  })

  test("multiple imports across cascade reach the consuming script body", async () => {
    const script = wrapWithImports(
      [
        `import { rootVal } from "data:text/javascript,export const rootVal = 1";`,
        `import { folderVal } from "data:text/javascript,export const folderVal = 2";`,
        `import { reqVal } from "data:text/javascript,export const reqVal = 3";`,
      ],
      `pw.env.set("SUM", String(rootVal + folderVal + reqVal));`
    )

    const result = await runPreRequest(script, envs)()

    expect(result).toBeRight()
    if (result._tag === "Right") {
      const updated = result.right.selected.find(
        (v) => v.key === "SUM"
      )
      expect(updated?.currentValue).toBe("6")
    }
  })
})
