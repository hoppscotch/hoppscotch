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

const outputOnlyLongFlags = new Set([
  "--silent",
  "--show-error",
  "--verbose",
  "--no-progress-meter",
])

const outputOnlyShortFlagPattern = /^-[sSvV]+$/

const tokenizeCurlCommand = (curlCmd: string) => {
  const tokens: string[] = []
  let token = ""
  let quote: '"' | "'" | null = null
  let escaped = false

  for (const char of curlCmd) {
    if (escaped) {
      token += char
      escaped = false
      continue
    }

    if (char === "\\") {
      token += char
      escaped = true
      continue
    }

    if (quote) {
      token += char

      if (char === quote) {
        quote = null
      }

      continue
    }

    if (char === '"' || char === "'") {
      token += char
      quote = char
      continue
    }

    if (/\s/.test(char)) {
      if (token.length > 0) {
        tokens.push(token)
        token = ""
      }

      continue
    }

    token += char
  }

  if (token.length > 0) {
    tokens.push(token)
  }

  return tokens
}

// Drop cURL flags that only change terminal output and should not affect request import.
// Only strips standalone tokens composed entirely of output-only flags.
// Mixed short options such as `-sH` remain untouched because they may affect the request.
const stripOutputOnlyFlags = (curlCmd: string) =>
  pipe(
    curlCmd,
    tokenizeCurlCommand,
    A.filter(
      (token) =>
        !outputOnlyLongFlags.has(token) &&
        !outputOnlyShortFlagPattern.test(token)
    ),
    (tokens) => tokens.join(" "),
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
    O.map(
      flow(paperCuts, replaceLongOptions, stripOutputOnlyFlags, prescreenXArgs)
    ),
    O.getOrElse(() => "")
  )
