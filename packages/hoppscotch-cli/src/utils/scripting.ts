/**
 * Wraps a script in an IIFE (Immediately Invoked Function Expression) to isolate
 * its scope. This prevents variable name clashes when combining multiple scripts
 * (e.g., collection + folder + request scripts).
 *
 * @param script - The script to wrap
 * @returns The script wrapped in an IIFE, or empty string if script is empty/whitespace
 */
export const wrapInIIFE = (script: string): string => {
  const trimmed = script?.trim()
  if (!trimmed) return ""
  return `(function() {\n${trimmed}\n})();`
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
