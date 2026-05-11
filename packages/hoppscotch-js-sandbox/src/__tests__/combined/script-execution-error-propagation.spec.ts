import { describe, expect, test } from "vitest"
import { runPreRequest, runTest } from "~/utils/test-helpers"

/**
 * The experimental sandbox silently swallowed top-level throws inside the
 * generated `await (async function(){...})()` wrapper. The fix routes the
 * error through a lexically-captured host reporter installed by bootstrap,
 * read back on the host side as the Left branch of the TaskEither pipeline.
 *
 * These tests exercise the sandbox contract directly by reproducing the
 * generated wrapper shape that `combineScriptsWithIIFE` emits from
 * `@hoppscotch/cli` and `@hoppscotch/common`.
 */
describe("script execution error propagation", () => {
  const envs = { global: [], selected: [] }

  // Mirrors `combineScriptsWithIIFE("experimental")` in the CLI and common
  // packages. Kept local to avoid a cross-package import.
  const wrapExperimental = (body: string): string =>
    [
      "const __hoppReporter = globalThis.__hoppReportScriptExecutionError;",
      "try {",
      `await (async function() {\n${body}\n})();`,
      "} catch (__hoppScriptExecutionError) {",
      "  __hoppReporter(__hoppScriptExecutionError);",
      "}",
    ].join("\n")

  test("experimental pre-request: synchronous top-level throw returns Left", async () => {
    const script = wrapExperimental(
      `throw new Error("pre-request top-level throw");`
    )

    const result = await runPreRequest(script, envs)()

    expect(result).toBeLeft()
    if (result._tag === "Left") {
      expect(result.left).toContain("pre-request top-level throw")
    }
  })

  test("experimental pre-request: rejected await inside IIFE returns Left", async () => {
    const script = wrapExperimental(
      `await Promise.reject(new Error("pre-request rejected await"));`
    )

    const result = await runPreRequest(script, envs)()

    expect(result).toBeLeft()
    if (result._tag === "Left") {
      expect(result.left).toContain("pre-request rejected await")
    }
  })

  test("experimental pre-request: valid script still returns Right", async () => {
    const script = wrapExperimental(`pw.env.set("FLAG", "ok");`)

    const result = await runPreRequest(script, envs)()

    expect(result).toBeRight()
  })

  test("experimental test-runner: synchronous top-level throw returns Left", async () => {
    const script = wrapExperimental(
      `throw new Error("test-runner top-level throw");`
    )

    const result = await runTest(script, envs)()

    expect(result).toBeLeft()
    if (result._tag === "Left") {
      expect(result.left).toContain("test-runner top-level throw")
    }
  })

  test("user script cannot tamper with the reporter to suppress error reporting", async () => {
    // User script attempts to delete + overwrite the globalThis reporter
    // before throwing; both defenses (immutable property + lexical capture
    // in the wrapper) keep the report path intact.
    const script = wrapExperimental(
      `
      try {
        delete globalThis.__hoppReportScriptExecutionError;
        globalThis.__hoppReportScriptExecutionError = () => {};
      } catch (_e) {
        // strict mode may throw on immutable-property tamper; ignore
      }
      throw new Error("tamper-attempt throw");
      `
    )

    const result = await runPreRequest(script, envs)()

    expect(result).toBeLeft()
    if (result._tag === "Left") {
      expect(result.left).toContain("tamper-attempt throw")
    }
  })
})
