/**
 * Module prefix added by Monaco editor for TypeScript module mode.
 * Enables IntelliSense and isolates variables across editor instances.
 */
export const MODULE_PREFIX = "export {};\n" as const;

/**
 * Strips `export {};` prefix (with or without newline) from scripts before execution
 * (non-module context) or when exporting collections.
 */
export const stripModulePrefix = (script: string): string => {
  if (script.startsWith(MODULE_PREFIX)) {
    return script.slice(MODULE_PREFIX.length);
  }
  if (script.startsWith("export {};")) {
    return script.slice("export {};".length);
  }
  return script;
};

export type CombineScriptsTarget = "experimental" | "legacy";

const wrapScript = (script: string, target: CombineScriptsTarget): string => {
  const stripped = stripModulePrefix(script.trim());
  if (!stripped) return "";
  const asyncKeyword = target === "experimental" ? "async " : "";
  return `${asyncKeyword}function() {\n${stripped}\n}`;
};

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
  const fns = scripts.map((s) => wrapScript(s, target)).filter((s) => s);
  if (fns.length === 0) return "";
  if (target === "experimental") {
    // Wrap the awaited chain in try/catch so top-level throws / rejected
    // awaits reach the host reporter; faraday-cage otherwise swallows
    // async-boundary errors via its keepAlive loop.
    const body = fns.map((fn) => `await (${fn})();`).join("\n");
    return [
      "const __hoppReporter = globalThis.__hoppReportScriptExecutionError;",
      "try {",
      body,
      "} catch (__hoppScriptExecutionError) {",
      "  __hoppReporter(__hoppScriptExecutionError);",
      "}",
    ].join("\n");
  }
  // Leading `;` guards against ASI: a prior `})` on the host line would
  // otherwise be read as a call against our IIFE expression.
  return fns.map((fn) => `;(${fn}).call(this);`).join("\n");
};

export const filterValidScripts = (
  scripts: (string | undefined | null)[]
): string[] =>
  scripts.filter(
    (script): script is string =>
      typeof script === "string" &&
      stripModulePrefix(script).trim().length > 0
  );
