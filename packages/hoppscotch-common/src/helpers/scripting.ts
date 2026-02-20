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
 * Regex for stripping the JSON-serialized module prefix (`export {};\\n`)
 * from scripts during collection exports.
 * Note: This matches the literal backslash-n (`\\n`), not an actual newline character.
 */
export const MODULE_PREFIX_REGEX_JSON_SERIALIZED = /export \{\};\\n/g

/**
 * Wraps a script body in an async function expression (without invoking it).
 * Used by {@link combineScriptsWithIIFE} to build a sequential await chain.
 *
 * @param script - The script to wrap
 * @returns An async function expression string, or empty string if script is empty/whitespace
 */
const wrapInAsyncFn = (script: string): string => {
  const trimmed = script?.trim()
  if (!trimmed) return ""
  const stripped = stripModulePrefix(trimmed)
  return `async function() {\n${stripped}\n}`
}

/**
 * Combines multiple scripts into a single sequentially executed async IIFE.
 * Each script is wrapped in its own async function for scope isolation, and
 * they are awaited in order so each script fully completes before the next
 * starts. This preserves execution order for scripts using async/await
 * (e.g., auth token refresh) while isolating local variable declarations.
 *
 * @param scripts - Array of scripts to combine
 * @returns Combined script that executes each part sequentially
 */
export const combineScriptsWithIIFE = (scripts: string[]): string => {
  const fns = scripts.map(wrapInAsyncFn).filter((s) => s)

  if (fns.length === 0) return ""

  const awaited = fns.map((fn) => `  await (${fn})();`).join("\n")
  return `(async () => {\n${awaited}\n})();`
}
