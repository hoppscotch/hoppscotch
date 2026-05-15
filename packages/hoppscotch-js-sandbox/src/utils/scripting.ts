import {
  Parser,
  type ExportAllDeclaration,
  type ExportNamedDeclaration,
  type ImportDeclaration,
  type Program,
} from "acorn"

// Monaco prepends this to TS-mode editor buffers so each script parses as a
// module. Strip it before legacy execution and before serializing to JSON.
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

export type CombineScriptsTarget = "experimental" | "legacy"

// Shared parser options. The experimental path admits ESM grammar (top-level
// imports + await) so they reach faraday-cage's module evaluator. The legacy
// path mirrors its executor's script-mode grammar — top-level `await` and
// `import` are rejected pre-cage to match what the legacy evaluator would.
const PARSE_OPTIONS = {
  experimental: {
    ecmaVersion: "latest",
    sourceType: "module",
    allowReturnOutsideFunction: true,
  },
  legacy: {
    ecmaVersion: "latest",
    sourceType: "script",
    allowReturnOutsideFunction: true,
  },
} as const

export const parseScriptForSyntax = (
  script: string,
  target: CombineScriptsTarget = "experimental"
): void => {
  Parser.parse(script, PARSE_OPTIONS[target])
}

type ImportBinding = {
  name: string
  source: string
}

type ExtractedImports = {
  importStatements: string[]
  body: string
  bindings: ImportBinding[]
  // Set when Acorn rejects the script, so the wrapper surfaces the original
  // parse error instead of a downstream "import declarations may only appear
  // at top level" from re-evaluating the unmodified body inside an IIFE.
  parseError?: string
}

// Wrapper-declared module-scope names + `globalThis` (which the wrapper
// reads for the reporter). User imports binding these would duplicate-
// declare or shadow them post-hoist, so we reject pre-cage.
const RESERVED_WRAPPER_NAMES = new Set(["__hoppReporter", "globalThis"])

// Top-level node shapes that resolve a module URL and therefore must reach
// module scope outside the IIFE wrapper: `import` declarations, plus
// re-export-from forms (`export { x } from "y"`, `export * from "y"`,
// `export * as ns from "y"`). Local-only `export const` / `export { x }`
// don't carry a `source`, so they stay in the body.
type ModuleResolvingDeclaration =
  | ImportDeclaration
  | (ExportNamedDeclaration & {
      source: NonNullable<ExportNamedDeclaration["source"]>
    })
  | ExportAllDeclaration

const isModuleResolvingDeclaration = (
  n: Program["body"][number]
): n is ModuleResolvingDeclaration =>
  n.type === "ImportDeclaration" ||
  n.type === "ExportAllDeclaration" ||
  (n.type === "ExportNamedDeclaration" && n.source !== null)

// Lifts top-level module-resolving declarations so they can be hoisted to
// module scope; the IIFE wrapper would otherwise reject them as `SyntaxError`.
const extractTopLevelImports = (script: string): ExtractedImports => {
  const empty: ExtractedImports = {
    importStatements: [],
    body: script,
    bindings: [],
  }
  if (!script.trim()) return empty

  let ast: Program
  try {
    ast = Parser.parse(script, PARSE_OPTIONS.experimental)
  } catch (err) {
    return {
      ...empty,
      parseError: err instanceof Error ? err.message : String(err),
    }
  }

  const moduleNodes = ast.body.filter(isModuleResolvingDeclaration)
  if (moduleNodes.length === 0) return empty

  let body = ""
  let cursor = 0
  for (const node of moduleNodes) {
    body += script.slice(cursor, node.start)
    cursor = node.end
  }
  body += script.slice(cursor)

  // Only `import` declarations introduce local bindings that could collide
  // across cascade levels. Re-exports rebind to the consumer, not to a
  // local name, so they don't participate in the duplicate-binding check.
  const bindings: ImportBinding[] = moduleNodes
    .filter((n): n is ImportDeclaration => n.type === "ImportDeclaration")
    .flatMap((n) =>
      n.specifiers.map((s) => ({
        name: s.local.name,
        source: String(n.source.value ?? ""),
      }))
    )

  return {
    importStatements: moduleNodes.map((n) => script.slice(n.start, n.end)),
    body,
    bindings,
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
 *   Top-level `import` and `export … from` declarations are hoisted out of
 *   the IIFEs so module resolution (e.g. faraday-cage's esmModuleLoader)
 *   can see them. Identical import statements across scripts are deduped;
 *   same-name imports from different sources, parse failures, and bindings
 *   that collide with wrapper internals all surface a friendly `SyntaxError`
 *   pre-cage.
 * - `legacy`: sync `(function(){...}).call(this);` lines. Top-level `await`
 *   is rejected at parse time.
 *
 * Side-effect imports run at module-evaluation time, before any cascade
 * body. The body-order guarantee (root → folder → request) does not extend
 * to top-level effects in imported modules. Value imports are unaffected.
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

  // Identical import statements (literal string match across scripts) are
  // deduped to a single emitted line. Same name from different sources is a
  // real conflict and surfaces a friendly `SyntaxError` pre-cage.
  const allImports = [
    ...new Set(extracted.flatMap((e) => e.importStatements)),
  ].filter(Boolean)

  const parseError = extracted.find((e) => e.parseError)?.parseError

  const sourcesByName = new Map<string, Set<string>>()
  for (const { name, source } of extracted.flatMap((e) => e.bindings)) {
    if (!sourcesByName.has(name)) sourcesByName.set(name, new Set())
    sourcesByName.get(name)!.add(source)
  }
  const conflictingName = [...sourcesByName.entries()].find(
    ([, sources]) => sources.size > 1
  )?.[0]

  const allBindingNames = new Set(
    extracted.flatMap((e) => e.bindings.map((b) => b.name))
  )
  const reservedConflict = [...RESERVED_WRAPPER_NAMES].find((n) =>
    allBindingNames.has(n)
  )

  if (fns.length === 0 && allImports.length === 0 && !parseError) return ""

  // Errors short-circuit before synthesis; reserved-name check sits before
  // the import-only return so reserved bindings still surface.
  if (parseError !== undefined) {
    return synthesizeReporterWrapper(
      `throw new SyntaxError(${JSON.stringify(`[Hoppscotch] Script failed to parse: ${parseError}`)});`
    )
  }

  if (conflictingName !== undefined) {
    return synthesizeReporterWrapper(
      `throw new SyntaxError(${JSON.stringify(`[Hoppscotch] '${conflictingName}' is imported from different sources across scripts in this request's chain. Please import it from a single source, or rename one of the imports to resolve the conflict.`)});`
    )
  }

  if (reservedConflict !== undefined) {
    return synthesizeReporterWrapper(
      `throw new SyntaxError(${JSON.stringify(`[Hoppscotch] '${reservedConflict}' is reserved by Hoppscotch's script wrapper and cannot be used as an import binding. Please rename the import.`)});`
    )
  }

  // Import-only cascade: skip the try/catch — no awaited bodies to route
  // errors from. Module-evaluation errors propagate via faraday-cage.
  if (fns.length === 0) return allImports.join("\n")

  // Wrap the awaited chain in try/catch so top-level throws / rejected
  // awaits reach the host reporter; faraday-cage otherwise swallows
  // async-boundary errors via its keepAlive loop.
  const body = fns.map((fn) => `await (${fn})();`).join("\n")
  const tryBlock = synthesizeReporterWrapper(body)

  if (allImports.length === 0) return tryBlock

  return [allImports.join("\n"), tryBlock].join("\n")
}

const synthesizeReporterWrapper = (bodyLines: string): string =>
  [
    "const __hoppReporter = globalThis.__hoppReportScriptExecutionError;",
    "try {",
    bodyLines,
    "} catch (__hoppScriptExecutionError) {",
    "  __hoppReporter(__hoppScriptExecutionError);",
    "}",
  ].join("\n")

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
