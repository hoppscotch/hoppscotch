import { ImportDeclaration, Parser, Program } from "acorn"

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
 * Strips the JSON-serialized `export {};` prefix (with optional `\n` literal)
 * from the start of any JSON string value during collection export.
 * Capture-and-reinsert is used in place of a lookbehind so the regex parses
 * on WebKit < 16.4 (Tauri's macOS WKWebView before Ventura 13.3).
 */
export const stripJsonSerializedModulePrefix = (json: string): string =>
  json.replace(/(:\s*")export \{\};(?:\\n)?/g, "$1")

// Shared parser options so the pre-cage syntax check and the import-extraction
// pass admit the same ESM grammar (top-level imports, top-level await, and
// IIFE-style top-level returns).
const SCRIPT_PARSE_OPTIONS = {
  ecmaVersion: "latest",
  sourceType: "module",
  allowReturnOutsideFunction: true,
} as const

// Throws on syntax failure; callers translate the throw to a friendly message.
export const parseScriptForSyntax = (script: string): void => {
  Parser.parse(script, SCRIPT_PARSE_OPTIONS)
}

export type CombineScriptsTarget = "experimental" | "legacy"

type ExtractedImports = {
  importSource: string
  body: string
  bindings: string[]
}

/**
 * Lifts top-level `import` declarations out of a script body so they can be
 * hoisted to module scope. The IIFE wrapper would otherwise turn them into
 * `SyntaxError` since `import` is only legal at module top-level.
 */
const extractTopLevelImports = (script: string): ExtractedImports => {
  const empty = { importSource: "", body: script, bindings: [] }
  if (!script.trim()) return empty

  let ast: Program
  try {
    ast = Parser.parse(script, SCRIPT_PARSE_OPTIONS)
  } catch {
    return empty
  }

  const importNodes = ast.body.filter(
    (n): n is ImportDeclaration => n.type === "ImportDeclaration"
  )
  if (importNodes.length === 0) return empty

  let body = ""
  let cursor = 0
  for (const node of importNodes) {
    body += script.slice(cursor, node.start)
    cursor = node.end
  }
  body += script.slice(cursor)

  return {
    importSource: importNodes
      .map((n) => script.slice(n.start, n.end))
      .join("\n"),
    body,
    bindings: importNodes.flatMap((n) => n.specifiers.map((s) => s.local.name)),
  }
}

const wrapLegacyScript = (script: string): string => {
  const stripped = stripModulePrefix(script.trim())
  if (!stripped) return ""
  return `function() {\n${stripped}\n}`
}

/**
 * Combines inherited scripts into a sequential chain. Each script runs in
 * its own function for scope isolation.
 *
 * - `experimental`: `await (async function(){...})();` lines, evaluated in
 *   an async host context so each `await` settles before the next runs.
 *   Top-level `import` declarations are hoisted out of the IIFEs so module
 *   resolution (e.g. faraday-cage's esmModuleLoader) can see them.
 * - `legacy`: sync `(function(){...}).call(this);` lines. Top-level `await`
 *   is rejected at parse time.
 */
export const combineScriptsWithIIFE = (
  scripts: string[],
  target: CombineScriptsTarget = "experimental"
): string => {
  if (target === "legacy") {
    const fns = scripts.map(wrapLegacyScript).filter((s) => s)
    if (fns.length === 0) return ""
    // Leading `;` guards against ASI: a prior `})` on the host line would
    // otherwise be read as a call against our IIFE expression.
    return fns.map((fn) => `;(${fn}).call(this);`).join("\n")
  }

  const extracted = scripts.map((s) =>
    extractTopLevelImports(stripModulePrefix(s.trim()))
  )

  const fns = extracted
    .map(({ body }) =>
      body.trim() ? `async function() {\n${body.trim()}\n}` : ""
    )
    .filter((s) => s)

  const allImports = extracted.flatMap((e) => e.importSource).filter(Boolean)
  const allBindings = extracted.flatMap((e) => e.bindings)

  if (fns.length === 0 && allImports.length === 0) return ""

  const seen = new Set<string>()
  const duplicates = allBindings.filter((name) => {
    if (seen.has(name)) return true
    seen.add(name)
    return false
  })

  // Wrap the awaited chain in try/catch so top-level throws / rejected
  // awaits reach the host reporter; faraday-cage otherwise swallows
  // async-boundary errors via its keepAlive loop.
  const body = fns.map((fn) => `await (${fn})();`).join("\n")
  const tryBlock = [
    "const __hoppReporter = globalThis.__hoppReportScriptExecutionError;",
    "try {",
    body,
    "} catch (__hoppScriptExecutionError) {",
    "  __hoppReporter(__hoppScriptExecutionError);",
    "}",
  ].join("\n")

  if (duplicates.length > 0) {
    const name = duplicates[0]
    const escaped = name.replace(/'/g, "\\'")
    return [
      "const __hoppReporter = globalThis.__hoppReportScriptExecutionError;",
      "try {",
      `  throw new SyntaxError("[Hoppscotch] '${escaped}' is imported by multiple scripts in this request's chain. Please keep the import in a single script, or rename one import to resolve the conflict.");`,
      "} catch (__hoppScriptExecutionError) {",
      "  __hoppReporter(__hoppScriptExecutionError);",
      "}",
    ].join("\n")
  }

  if (allImports.length === 0) return tryBlock

  return [allImports.join("\n"), tryBlock].join("\n")
}

// Monaco prepends "export {};\n" to empty scripts — strip before checking.
export const hasActualScript = (script: string | undefined | null): boolean => {
  if (!script) return false
  return stripModulePrefix(script.trim()).length > 0
}

export const filterValidScripts = (
  scripts: (string | undefined | null)[]
): string[] =>
  scripts.filter(
    (script): script is string =>
      typeof script === "string" && stripModulePrefix(script).trim().length > 0
  )
