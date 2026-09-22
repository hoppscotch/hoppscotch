const replaceables: { [key: string]: string } = {
  "--request": "-X",
  "--header": "-H",
  "--url": "",
  "--form": "-F",
  "--data-raw": "--data",
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
        (quoteMode === "$'" &&
          ch === "'" &&
          !isQuoteEscaped(cmd, i)) ||
        (quoteMode === '"' &&
          ch === '"' &&
          !isQuoteEscaped(cmd, i)) ||
        (quoteMode === '$"' &&
          ch === '"' &&
          !isQuoteEscaped(cmd, i))
      ) {
        quoteMode = null
      }
      i++
      continue
    }

    const isBoundary = i === 0 || isWhitespace(cmd[i - 1])
    const isDollarBoundary = isBoundary || cmd[i - 1] === "="

    // Handle bash ANSI-C / locale quotes: $'...' or $"..." outside quotes only at boundaries
    if (
      isDollarBoundary &&
      ch === "$" &&
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

      // If it contains escaped quotes, preserve $'...' so replaceJSONDataArgsWithPlaceholders can safely placeholder it
      if (hasEscapedQuote && end < cmd.length) {
        output += cmd.slice(i, end + 1)
        i = end + 1
        continue
      }

      output += nextQuote
      quoteMode = nextQuote === "'" ? "$'" : '$"'
      i += 2
      continue
    }

    // Normal quote start
    if (ch === "'" || ch === '"') {
      output += ch
      quoteMode = ch
      i++
      continue
    }

    if (isBoundary) {
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
            output += replacement + " "
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

      // 3. Check for short option with '=' followed by quote or value: -([a-zA-Z])=(?=['"]|\$['"])
      const shortOptEqMatch = cmd.slice(i).match(/^-([a-zA-Z])=(?=['"]|\$['"])/)
      if (shortOptEqMatch) {
        output += "-" + shortOptEqMatch[1] + " "
        i += shortOptEqMatch[0].length
        continue
      }
    }

    output += ch
    i++
  }

  return output.trim()
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
  let shellQuoteMode: '"' | "'" | "$'" | '$"' | null = null

  while (i < curlCommand.length) {
    const ch = curlCommand[i]

    // Inside a top-level shell-quoted argument, copy verbatim and watch
    // for the close. Skip flag detection so an embedded `-d`/`--data`
    // inside e.g. a header value doesn't get intercepted as a data flag.
    if (shellQuoteMode !== null) {
      if (
        (shellQuoteMode === "'" && ch === "'") ||
        (shellQuoteMode === "$'" &&
          ch === "'" &&
          !isQuoteEscaped(curlCommand, i)) ||
        (shellQuoteMode === '"' &&
          ch === '"' &&
          !isQuoteEscaped(curlCommand, i)) ||
        (shellQuoteMode === '$"' &&
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
    const isDollarBoundaryBefore =
      isBoundaryBefore || curlCommand[i - 1] === "="
    if (
      isDollarBoundaryBefore &&
      ch === "$" &&
      (curlCommand[i + 1] === "'" || curlCommand[i + 1] === '"')
    ) {
      const nextQuote = curlCommand[i + 1] as "'" | '"'
      let end = i + 2
      while (end < curlCommand.length) {
        if (curlCommand[end] === nextQuote && !isQuoteEscaped(curlCommand, end))
          break
        end++
      }
      if (end < curlCommand.length) {
        const rawAnsiC = curlCommand.slice(i + 2, end)
        const placeholder = getJSONDataPlaceholder(extractedJSONData.length)
        extractedJSONData.push(rawAnsiC)
        output += `'${placeholder}'`
        i = end + 1
        continue
      }
    }

    if (!isBoundaryBefore) {
      if (ch === '"' || ch === "'") shellQuoteMode = ch
      output += ch
      i++
      continue
    }

    const flag = dataFlags.find((f) => curlCommand.startsWith(f, i))

    if (!flag) {
      if (ch === '"' || ch === "'") shellQuoteMode = ch
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

  for (const key of Object.keys(restored)) {
    restored[key] = restorePlaceholder(restored[key], extractedJSONData)
  }

  return restored as T
}
