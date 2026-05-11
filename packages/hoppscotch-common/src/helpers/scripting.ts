/**
 * Module prefix added by Monaco editor for TypeScript module mode.
 * Enables IntelliSense and isolates variables across editor instances.
 */
export const MODULE_PREFIX = "export {};\n" as const

/**
 * Strips `export {};\n` prefix from scripts before legacy sandbox execution
 * (non-module context) or when exporting collections.
 */
export const stripModulePrefix = (script: string): string => {
  if (script.startsWith(MODULE_PREFIX)) {
    return script.slice(MODULE_PREFIX.length)
  }
  if (script.startsWith("export {};")) {
    return script.slice("export {};".length)
  }
  return script
}

/**
 * Anchored to JSON value-opening delimiters so it only matches inside JSON
 * string values during collection export, not inside script source. Matches
 * both `export {};\\n` and `export {};` (`\\n` is the literal backslash-n
 * pair, not a newline).
 */
export const MODULE_PREFIX_REGEX_JSON_SERIALIZED =
  /(?<=:\s*")export \{\};(?:\\n)?/g

export type CombineScriptsTarget = "experimental" | "legacy"

const wrapScript = (script: string, target: CombineScriptsTarget): string => {
  const stripped = stripModulePrefix(script.trim())
  if (!stripped) return ""
  const asyncKeyword = target === "experimental" ? "async " : ""
  return `${asyncKeyword}function() {\n${stripped}\n}`
}

/**
 * Combines inherited scripts into a sequential chain. Each script runs in
 * its own function for scope isolation.
 *
 * - `experimental`: `await (async function(){...})();` lines, evaluated in
 *   an async host context so each `await` settles before the next runs.
 * - `legacy`: sync `(function(){...}).call(this);` lines. Top-level `await`
 *   is rejected at parse time.
 */
export const combineScriptsWithIIFE = (
  scripts: string[],
  target: CombineScriptsTarget = "experimental"
): string => {
  const fns = scripts.map((s) => wrapScript(s, target)).filter((s) => s)
  if (fns.length === 0) return ""
  if (target === "experimental") {
    // Wrap the entire awaited chain in try/catch so a top-level throw (or a
    // rejected await) surfaces synchronously via the host reporter.
    // faraday-cage swallows rejected keepAlive promises and does not await
    // afterScriptExecutionHooks, so this is the only reliable channel for
    // async-boundary errors to reach the host caller.
    //
    // The reporter is captured in a const before the try so a user script
    // that tampers with `globalThis.__hoppReportScriptExecutionError`
    // inside the try body cannot suppress the report. Bootstrap installs
    // the property as non-writable and non-configurable for defense in
    // depth; the lexical capture makes that redundant but explicit.
    const body = fns.map((fn) => `await (${fn})();`).join("\n")
    return [
      "const __hoppReporter = globalThis.__hoppReportScriptExecutionError;",
      "try {",
      body,
      "} catch (__hoppScriptExecutionError) {",
      "  __hoppReporter(__hoppScriptExecutionError);",
      "}",
    ].join("\n")
  }
  // Leading `;` guards against ASI: a prior `})` on the host line would
  // otherwise be read as a call against our IIFE expression.
  return fns.map((fn) => `;(${fn}).call(this);`).join("\n")
}

// Monaco prepends "export {};\n" to empty scripts — strip before checking.
export const hasActualScript = (script: string | undefined | null): boolean => {
  if (!script) return false
  return stripModulePrefix(script.trim()).length > 0
}
