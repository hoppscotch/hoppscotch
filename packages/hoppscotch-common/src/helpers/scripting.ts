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
 * Regex for stripping `export {};\n` from JSON-serialized scripts
 * during collection exports.
 */
export const MODULE_PREFIX_REGEX = /export \{\};\\n/g
