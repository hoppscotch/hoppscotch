import { pipe, flow } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"

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

const paperCuts = flow(
  // remove '\' and newlines
  S.replace(/ ?\\ ?$/gm, " "),
  S.replace(/\n/g, " "),
  // remove all $ symbols from start of argument values
  S.replace(/\$'/g, "'"),
  S.replace(/\$"/g, '"'),
  S.trim
)

// replace --zargs option with -Z
const replaceLongOptions = (curlCmd: string) =>
  pipe(Object.keys(replaceables), A.reduce(curlCmd, replaceFunction))

const replaceFunction = (curlCmd: string, r: string) =>
  pipe(
    curlCmd,
    O.fromPredicate(
      () => r.includes("data") || r.includes("form") || r.includes("header")
    ),
    O.map(S.replace(RegExp(`[ \t]${r}(["' ])`, "g"), ` ${replaceables[r]}$1`)),
    O.alt(() =>
      pipe(
        curlCmd,
        S.replace(RegExp(`[ \t]${r}(["' ])`), ` ${replaceables[r]}$1`),
        O.of
      )
    ),
    O.getOrElse(() => "")
  )

// yargs parses -XPOST as separate arguments. just prescreen for it.
const prescreenXArgs = flow(
  S.replace(
    / -X(GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE)/,
    " -X $1"
  ),
  S.trim
)

/**
 * Sanitizes and makes curl string processable
 * @param curlCommand Raw curl command string
 * @returns Processed curl command string
 */
export const preProcessCurlCommand = (curlCommand: string) =>
  pipe(
    curlCommand,
    O.fromPredicate((curlCmd) => curlCmd.length > 0),
    O.map(flow(paperCuts, replaceLongOptions, prescreenXArgs)),
    O.getOrElse(() => "")
  )

const JSON_DATA_PLACEHOLDER_PREFIX = "__HOPP_CURL_JSON_DATA_"
const JSON_DATA_PLACEHOLDER_SUFFIX = "__"

const isWhitespace = (ch: string | undefined) =>
  ch === " " || ch === "\t" || ch === "\n" || ch === "\r"

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
  let shellQuote: '"' | "'" | null = null

  while (i < curlCommand.length) {
    const ch = curlCommand[i]

    // Inside a top-level shell-quoted argument, copy verbatim and watch
    // for the close. Skip flag detection so an embedded `-d`/`--data`
    // inside e.g. a header value doesn't get intercepted as a data flag.
    if (shellQuote !== null) {
      if (
        ch === shellQuote &&
        (shellQuote === "'" || curlCommand[i - 1] !== "\\")
      ) {
        shellQuote = null
      }
      output += ch
      i++
      continue
    }

    const isBoundaryBefore = i === 0 || isWhitespace(curlCommand[i - 1])
    if (!isBoundaryBefore) {
      if (ch === '"' || ch === "'") shellQuote = ch
      output += ch
      i++
      continue
    }

    const flag = dataFlags.find((f) => curlCommand.startsWith(f, i))

    if (!flag) {
      if (ch === '"' || ch === "'") shellQuote = ch
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

const DATA_ARG_KEYS = ["d", "data"] as const

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

  for (const key of DATA_ARG_KEYS) {
    if (key in restored) {
      restored[key] = restorePlaceholder(restored[key], extractedJSONData)
    }
  }

  return restored as T
}
