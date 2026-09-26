const replaceables: { [key: string]: string } = {
  "--request": "-X",
  "--header": "-H",
  "--url": "",
  "--form": "-F",
  "--data-raw": "-d",
  "--data": "-d",
  "--data-ascii": "-d",
  "--data-binary": "-d",
  "--user": "-u",
  "--get": "-G",
}

const isWhitespace = (ch: string | undefined) =>
  ch === " " || ch === "\t" || ch === "\n" || ch === "\r"

const longOptionKeys = Object.keys(replaceables).sort(
  (a, b) => b.length - a.length
)

export const countPrecedingBackslashes = (
  str: string,
  index: number
): number => {
  let count = 0
  let i = index - 1
  while (i >= 0 && str[i] === "\\") {
    count++
    i--
  }
  return count
}

export const isQuoteEscaped = (str: string, index: number): boolean =>
  countPrecedingBackslashes(str, index) % 2 === 1

/**
 * Escapes backslashes and double quotes so that the content can be safely
 * wrapped in double quotes without prematurely terminating the wrapper or
 * corrupting escaped characters.
 */
export const escapeDoubleQuotedWrapper = (str: string): string => {
  let result = ""
  for (let idx = 0; idx < str.length; idx++) {
    const ch = str[idx]
    if (ch === '"' && !isQuoteEscaped(str, idx)) {
      result += '\\"'
      continue
    }
    result += ch
  }
  if (countPrecedingBackslashes(str, str.length) % 2 === 1) {
    result += "\\"
  }
  return result
}

/**
 * Sanitizes and makes curl string processable in a quote-aware manner.
 * Option normalizations, short-option equals, and bash ANSI-C quote transformations
 * are only performed outside shell-quoted arguments to prevent corrupting payloads or queries.
 *
 * @param curlCommand Raw curl command string
 * @returns Processed curl command string
 */
export const preProcessCurlCommand = (curlCommand: string) => {
  if (!curlCommand || curlCommand.length === 0) return ""

  // Join line continuations and newlines into spaces
  const cmd = curlCommand.replace(/ ?\\ ?\r?\n/g, " ").replace(/\r?\n/g, " ")

  let output = ""
  let i = 0
  let quoteMode: "'" | '"' | "$'" | '$"' | null = null

  while (i < cmd.length) {
    const ch = cmd[i]

    // Inside quotes: pass verbatim until matching closing quote.
    // In POSIX single quotes ('...'), backslash never escapes the quote; single quote always closes.
    // In double quotes ("...") or ANSI-C ($'...') / locale ($"..."), only an unescaped quote closes.
    if (quoteMode !== null) {
      output += ch
      if (
        (quoteMode === "'" && ch === "'") ||
        (quoteMode === "$'" && ch === "'" && !isQuoteEscaped(cmd, i)) ||
        (quoteMode === '"' && ch === '"' && !isQuoteEscaped(cmd, i)) ||
        (quoteMode === '$"' && ch === '"' && !isQuoteEscaped(cmd, i))
      ) {
        quoteMode = null
      }
      i++
      continue
    }

    const isCmdBoundary = i === 0 || isWhitespace(cmd[i - 1])
    const isBoundary =
      isCmdBoundary ||
      (output.length > 0 && isWhitespace(output[output.length - 1]))

    // Handle bash ANSI-C / locale quotes: $'...' or $"..." outside quotes
    if (
      ch === "$" &&
      !isQuoteEscaped(cmd, i) &&
      (cmd[i + 1] === "'" || cmd[i + 1] === '"')
    ) {
      const nextQuote = cmd[i + 1] as "'" | '"'
      let end = i + 2
      let hasEscapedQuote = false
      while (end < cmd.length) {
        if (cmd[end] === nextQuote && !isQuoteEscaped(cmd, end)) break
        if (cmd[end] === nextQuote && isQuoteEscaped(cmd, end)) {
          hasEscapedQuote = true
        }
        end++
      }

      if (end < cmd.length) {
        const rawContent = cmd.slice(i + 2, end)

        if (nextQuote === '"') {
          output += isBoundary
            ? `"${escapeDoubleQuotedWrapper(rawContent)}"`
            : rawContent
                .replace(/\\'/g, "%27")
                .replace(/'/g, "%27")
                .replace(/\\"/g, "%22")
                .replace(/"/g, "%22")
                .replace(/[ \t\r\n]/g, (m) => encodeURIComponent(m))
          i = end + 1
          continue
        }

        // For bash ANSI-C quotes $'...'
        if (isBoundary) {
          if (hasEscapedQuote) {
            const unescapedContent = rawContent.replace(/\\'/g, "'")
            output += `"${escapeDoubleQuotedWrapper(unescapedContent)}"`
          } else {
            output += `'${rawContent}'`
          }
          i = end + 1
          continue
        }

        // Inside a param / URL or concatenated word (e.g. ?q=abc$'def' or ?q=$'hello world')
        // Percent-encode apostrophe, double quote, and whitespace so it preserves token boundaries in yargs-parser
        output += rawContent
          .replace(/\\'/g, "%27")
          .replace(/\\"/g, "%22")
          .replace(/"/g, "%22")
          .replace(/[ \t\r\n]/g, (m) => encodeURIComponent(m))
        i = end + 1
        continue
      }
    }

    // Normal quote start
    if ((ch === "'" || ch === '"') && !isQuoteEscaped(cmd, i)) {
      output += ch
      quoteMode = ch
      i++
      continue
    }

    if (isCmdBoundary) {
      // 1. Check for long options
      let matchedLongOpt: string | null = null
      for (const opt of longOptionKeys) {
        if (cmd.startsWith(opt, i)) {
          const after = cmd[i + opt.length]
          if (after === undefined || isWhitespace(after) || after === "=") {
            matchedLongOpt = opt
            break
          }
        }
      }

      if (matchedLongOpt) {
        const replacement = replaceables[matchedLongOpt]
        let j = i + matchedLongOpt.length
        if (cmd[j] === "=") {
          j++
          if (replacement.length > 0) {
            // If followed by bash ANSI-C or locale quote, normalize with space
            // so the quote handler can wrap it as a clean argument
            if (cmd[j] === "$" && (cmd[j + 1] === "'" || cmd[j + 1] === '"')) {
              output += replacement + " "
            } else {
              output += replacement + "="
            }
          }
        } else {
          if (replacement.length > 0) {
            output += replacement
          } else {
            // E.g. --url without =: skip following whitespace if any to avoid extra space
            while (isWhitespace(cmd[j])) j++
          }
        }
        i = j
        continue
      }

      // 2. Check for -X(METHOD) e.g. -XPOST
      const methodMatch = cmd
        .slice(i)
        .match(
          /^-X(GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE)(?=[ \t'"]|$)/
        )
      if (methodMatch) {
        output += "-X " + methodMatch[1]
        i += methodMatch[0].length
        continue
      }

      // 3. Check for short option with '=' followed by quote, or directly attached to ANSI-C quote:
      const shortOptMatch = cmd
        .slice(i)
        .match(/^-([a-zA-Z])(?:=(?=['"]|\$['"])|(?=\$['"]))/i)
      if (shortOptMatch) {
        output += "-" + shortOptMatch[1] + " "
        i += shortOptMatch[0].length
        continue
      }
    }

    output += ch
    i++
  }

  return output.trim()
}

export interface PlaceholderReplacement {
  placeholder: string
  replacement: string
}

export interface ProtectedCommandResult {
  protectedCommand: string
  placeholder: string | null
  placeholders?: PlaceholderReplacement[]
}

/**
 * Replaces escaped double quotes (\") inside double-quoted arguments or outside quotes,
 * escaped single quotes (\'), and escaped whitespace (\ ) outside quotes with collision-proof
 * dynamic placeholders so that yargs-parser does not prematurely terminate or corrupt arguments.
 */
export const protectEscapedDoubleQuotes = (
  cmd: string
): ProtectedCommandResult => {
  if (!cmd.includes("\\")) {
    return {
      protectedCommand: cmd,
      placeholder: null,
      placeholders: [],
    }
  }

  // Generate collision-proof dynamic placeholders guaranteed not to exist in cmd
  let dquoteCandidate = `__HOPP_ESC_DQUOTE_${Math.random().toString(36).slice(2)}__`
  while (cmd.includes(dquoteCandidate)) {
    dquoteCandidate = `__HOPP_ESC_DQUOTE_${Math.random().toString(36).slice(2)}__`
  }

  let squoteCandidate = `__HOPP_ESC_SQUOTE_${Math.random().toString(36).slice(2)}__`
  while (cmd.includes(squoteCandidate) || squoteCandidate === dquoteCandidate) {
    squoteCandidate = `__HOPP_ESC_SQUOTE_${Math.random().toString(36).slice(2)}__`
  }

  let spaceCandidate = `__HOPP_ESC_SPACE_${Math.random().toString(36).slice(2)}__`
  while (
    cmd.includes(spaceCandidate) ||
    spaceCandidate === dquoteCandidate ||
    spaceCandidate === squoteCandidate
  ) {
    spaceCandidate = `__HOPP_ESC_SPACE_${Math.random().toString(36).slice(2)}__`
  }

  let output = ""
  let quote: "'" | '"' | null = null
  let dquoteReplacements = 0
  let squoteReplacements = 0
  let spaceReplacements = 0

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i]

    if (quote === "'") {
      if (ch === "'") {
        quote = null
      }
      output += ch
      continue
    }

    if (quote === '"') {
      if (ch === '"' && !isQuoteEscaped(cmd, i)) {
        quote = null
        output += ch
        continue
      }
      if (ch === '"' && isQuoteEscaped(cmd, i)) {
        if (output.endsWith("\\")) {
          output = output.slice(0, -1)
        }
        output += dquoteCandidate
        dquoteReplacements++
        continue
      }
      output += ch
      continue
    }

    // Outside quotes:
    if (ch === '"') {
      if (isQuoteEscaped(cmd, i)) {
        if (output.endsWith("\\")) {
          output = output.slice(0, -1)
        }
        output += dquoteCandidate
        dquoteReplacements++
        continue
      }
      quote = '"'
      output += ch
      continue
    }

    if (ch === "'") {
      if (isQuoteEscaped(cmd, i)) {
        if (output.endsWith("\\")) {
          output = output.slice(0, -1)
        }
        output += squoteCandidate
        squoteReplacements++
        continue
      }
      quote = "'"
      output += ch
      continue
    }

    if (isWhitespace(ch)) {
      if (isQuoteEscaped(cmd, i)) {
        if (output.endsWith("\\")) {
          output = output.slice(0, -1)
        }
        output += spaceCandidate
        spaceReplacements++
        continue
      }
      output += ch
      continue
    }

    output += ch
  }

  const replacements: PlaceholderReplacement[] = []
  if (dquoteReplacements > 0) {
    replacements.push({ placeholder: dquoteCandidate, replacement: '"' })
  }
  if (squoteReplacements > 0) {
    replacements.push({ placeholder: squoteCandidate, replacement: "'" })
  }
  if (spaceReplacements > 0) {
    replacements.push({ placeholder: spaceCandidate, replacement: " " })
  }

  if (replacements.length === 0) {
    return {
      protectedCommand: cmd,
      placeholder: null,
      placeholders: [],
    }
  }

  return {
    protectedCommand: output,
    placeholder: dquoteReplacements > 0 ? dquoteCandidate : null,
    placeholders: replacements,
  }
}

/**
 * Restores escaped quote and character placeholders in parsed arguments.
 */
export const restoreEscapedDoubleQuotes = <T>(
  parsedArguments: T,
  placeholders?: string | PlaceholderReplacement[] | null
): T => {
  if (
    !placeholders ||
    !parsedArguments ||
    typeof parsedArguments !== "object"
  ) {
    return parsedArguments
  }

  const replacementsList: PlaceholderReplacement[] =
    typeof placeholders === "string"
      ? [{ placeholder: placeholders, replacement: '"' }]
      : Array.isArray(placeholders)
        ? placeholders
        : []

  if (replacementsList.length === 0) {
    return parsedArguments
  }

  const restoreVal = (val: unknown): unknown => {
    if (typeof val === "string") {
      let str = val
      for (const { placeholder, replacement } of replacementsList) {
        if (str.includes(placeholder)) {
          str = str.split(placeholder).join(replacement)
        }
      }
      return str
    }
    if (Array.isArray(val)) {
      return val.map(restoreVal)
    }
    if (val && typeof val === "object") {
      const res: Record<string, unknown> = {}
      for (const k of Object.keys(val)) {
        res[k] = restoreVal((val as Record<string, unknown>)[k])
      }
      return res
    }
    return val
  }

  const args = parsedArguments as Record<string, unknown>
  const restored: Record<string, unknown> = {}
  for (const k of Object.keys(args)) {
    restored[k] = restoreVal(args[k])
  }
  return restored as T
}

const JSON_DATA_PLACEHOLDER_PREFIX = "__HOPP_CURL_JSON_DATA_"
const JSON_DATA_PLACEHOLDER_SUFFIX = "__"

const scanJSONValueEnd = (input: string, startIndex: number) => {
  const start = input[startIndex]
  if (start !== "{" && start !== "[") return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = startIndex; i < input.length; i++) {
    const ch = input[i]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }

      if (ch === "\\") {
        escaped = true
        continue
      }

      if (ch === '"') {
        inString = false
      }

      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === "{" || ch === "[") {
      depth++
      continue
    }

    if (ch === "}" || ch === "]") {
      depth--
      if (depth === 0) return i
    }
  }

  return null
}

const getJSONDataPlaceholder = (index: number) =>
  `${JSON_DATA_PLACEHOLDER_PREFIX}${index}${JSON_DATA_PLACEHOLDER_SUFFIX}`

const isJSONDataPlaceholder = (value: unknown): value is string =>
  typeof value === "string" &&
  value.startsWith(JSON_DATA_PLACEHOLDER_PREFIX) &&
  value.endsWith(JSON_DATA_PLACEHOLDER_SUFFIX)

const placeholderIndex = (value: string) => {
  const match = value.match(
    new RegExp(
      `^${JSON_DATA_PLACEHOLDER_PREFIX}(\\d+)${JSON_DATA_PLACEHOLDER_SUFFIX}$`
    )
  )
  return match ? Number(match[1]) : null
}

/**
 * Some exported curl commands wrap the request body in single quotes but
 * contain unescaped single quotes (e.g. `'''text'''`), which breaks the
 * argument tokenizer. Replace JSON bodies passed via `-d`/`--data*` with
 * placeholders before yargs-parser sees them, then restore them after.
 */
export const replaceJSONDataArgsWithPlaceholders = (curlCommand: string) => {
  const dataFlags = [
    "--data-raw",
    "--data-binary",
    "--data-ascii",
    "--data",
    "-d",
  ]
  const extractedJSONData: string[] = []

  let output = ""
  let i = 0
  let shellQuoteMode: '"' | "'" | null = null

  while (i < curlCommand.length) {
    const ch = curlCommand[i]

    // Inside a top-level shell-quoted argument, copy verbatim and watch
    // for the close. Skip flag detection so an embedded `-d`/`--data`
    // inside e.g. a header value doesn't get intercepted as a data flag.
    if (shellQuoteMode !== null) {
      if (
        (shellQuoteMode === "'" && ch === "'") ||
        (shellQuoteMode === '"' &&
          ch === '"' &&
          !isQuoteEscaped(curlCommand, i))
      ) {
        shellQuoteMode = null
      }
      output += ch
      i++
      continue
    }

    const isBoundaryBefore = i === 0 || isWhitespace(curlCommand[i - 1])

    if (!isBoundaryBefore) {
      if ((ch === '"' || ch === "'") && !isQuoteEscaped(curlCommand, i)) {
        shellQuoteMode = ch
      }
      output += ch
      i++
      continue
    }

    const flag = dataFlags.find((f) => curlCommand.startsWith(f, i))

    if (!flag) {
      if ((ch === '"' || ch === "'") && !isQuoteEscaped(curlCommand, i)) {
        shellQuoteMode = ch
      }
      output += ch
      i++
      continue
    }

    const afterFlag = curlCommand[i + flag.length]
    const isBoundaryAfter =
      afterFlag === undefined ||
      isWhitespace(afterFlag) ||
      afterFlag === "=" ||
      afterFlag === "'" ||
      afterFlag === '"'

    if (!isBoundaryAfter) {
      output += curlCommand[i]
      i++
      continue
    }

    // Try to parse the value part (supports `-d VALUE`, `-d'VALUE'`, `--data=VALUE`, etc.)
    let j = i + flag.length

    if (curlCommand[j] === "=") j++
    while (isWhitespace(curlCommand[j])) j++

    const maybeQuote = curlCommand[j]
    const quoted = maybeQuote === "'" || maybeQuote === '"'
    const quoteChar = quoted ? maybeQuote : null
    if (quoted) j++
    while (isWhitespace(curlCommand[j])) j++

    const valueStart = j
    const endIndex = scanJSONValueEnd(curlCommand, valueStart)

    if (endIndex === null) {
      output += curlCommand[i]
      i++
      continue
    }

    const jsonBody = curlCommand.slice(valueStart, endIndex + 1)
    const placeholder = getJSONDataPlaceholder(extractedJSONData.length)
    extractedJSONData.push(jsonBody)

    if (output.length > 0 && !isWhitespace(output[output.length - 1]))
      output += " "

    output += `-d ${placeholder}`

    let nextIndex = endIndex + 1
    if (quoteChar && curlCommand[nextIndex] === quoteChar) nextIndex++

    if (
      nextIndex < curlCommand.length &&
      !isWhitespace(curlCommand[nextIndex])
    ) {
      output += " "
    }

    i = nextIndex
  }

  return {
    curlCommand: output.trim(),
    extractedJSONData,
  }
}

const restorePlaceholder = (
  value: unknown,
  extractedJSONData: string[]
): unknown => {
  if (typeof value === "string") {
    if (!isJSONDataPlaceholder(value)) return value
    const idx = placeholderIndex(value)
    if (idx === null) return value
    return extractedJSONData[idx] ?? value
  }

  if (Array.isArray(value)) {
    return value.map((v) => restorePlaceholder(v, extractedJSONData))
  }

  return value
}

const DATA_ARG_KEYS = ["d", "data"] as const

export const restoreJSONDataArgsFromPlaceholders = <T>(
  parsedArguments: T,
  extractedJSONData: string[]
): T => {
  if (extractedJSONData.length === 0) return parsedArguments
  if (!parsedArguments || typeof parsedArguments !== "object") {
    return parsedArguments
  }

  const args = parsedArguments as Record<string, unknown>
  const restored: Record<string, unknown> = { ...args }

  for (const key of DATA_ARG_KEYS) {
    if (key in restored) {
      restored[key] = restorePlaceholder(restored[key], extractedJSONData)
    }
  }

  return restored as T
}
