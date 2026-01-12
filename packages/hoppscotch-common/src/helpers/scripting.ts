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
  return script.startsWith(MODULE_PREFIX)
    ? script.slice(MODULE_PREFIX.length)
    : script
}

/**
 * Regex for stripping the JSON-serialized module prefix (`export {};\\n`)
 * from scripts during collection exports.
 * Note: This matches the literal backslash-n (`\\n`), not an actual newline character.
 */
export const MODULE_PREFIX_REGEX_JSON_SERIALIZED = /export \{\};\\n/g

/**
 * Wraps a script in an async IIFE (Immediately Invoked Function Expression) to isolate
 * its scope. This prevents variable name clashes when combining multiple scripts
 * (e.g., collection + folder + request scripts) and supports async/await operations.
 *
 * @param script - The script to wrap
 * @returns The script wrapped in an async IIFE, or empty string if script is empty/whitespace
 */
export const wrapInIIFE = (script: string): string => {
  const trimmed = script?.trim()
  if (!trimmed) return ""
  return `(async function() {\n${trimmed}\n})();`
}

/**
 * Combines multiple scripts by wrapping each in an IIFE and joining them.
 * This allows scripts to share the global `pw`/`pm` object while isolating
 * local variable declarations to prevent clashes.
 *
 * @param scripts - Array of scripts to combine
 * @returns Combined script with each part wrapped in an IIFE
 */
export const combineScriptsWithIIFE = (scripts: string[]): string => {
  return scripts
    .map(wrapInIIFE)
    .filter((s) => s)
    .join("\n\n")
}
