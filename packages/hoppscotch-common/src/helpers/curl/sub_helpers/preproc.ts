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

/**
 * ANSI-C escape sequence mappings as per bash specification.
 * See: https://www.gnu.org/software/bash/manual/bash.html#ANSI_002dC-Quoting
 *
 * Note: \\ must be processed carefully to avoid double-processing.
 * We use a single-pass regex to handle all escapes correctly.
 */
const ansiCEscapeMap: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  "\\": "\\",
  "'": "'",
  '"': '"',
  a: "\x07", // alert (bell)
  b: "\b", // backspace
  e: "\x1b", // escape
  f: "\f", // form feed
  v: "\v", // vertical tab
}

/**
 * Process ANSI-C escape sequences inside a $'...' quoted string.
 * Converts escape sequences like \n, \t, \\, etc. to their actual characters.
 * Uses a single-pass regex to correctly handle sequences like \\n (literal \n).
 */
const processAnsiCEscapes = (content: string): string => {
  // Single-pass regex that matches all escape sequences
  // This correctly handles \\n as backslash + n (not newline)
  return content.replace(
    /\\(?:([ntrabe"'fv\\])|([0-7]{1,3})|x([0-9A-Fa-f]{1,2})|u([0-9A-Fa-f]{1,4}))/g,
    (match, char, octal, hex, unicode) => {
      if (char !== undefined) {
        return ansiCEscapeMap[char] ?? match
      }
      if (octal !== undefined) {
        return String.fromCharCode(parseInt(octal, 8))
      }
      if (hex !== undefined) {
        return String.fromCharCode(parseInt(hex, 16))
      }
      if (unicode !== undefined) {
        return String.fromCharCode(parseInt(unicode, 16))
      }
      return match
    }
  )
}

/**
 * Convert ANSI-C quoted strings ($'...') to regular double-quoted strings
 * with properly processed escape sequences.
 */
const processAnsiCQuotedStrings = (curlCmd: string): string => {
  // Match $'...' patterns, handling escaped single quotes inside
  // The pattern handles: $'content' where content can include \' for escaped quotes
  const ansiCPattern = /\$'((?:[^'\\]|\\.)*)'/g

  return curlCmd.replace(ansiCPattern, (_, content: string) => {
    const processed = processAnsiCEscapes(content)
    // Escape any double quotes and backslashes for the double-quoted output
    const escaped = processed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
    return `"${escaped}"`
  })
}

const paperCuts = flow(
  // remove '\' and newlines (line continuations)
  S.replace(/ ?\\ ?$/gm, " "),
  S.replace(/\n/g, " "),
  // Process ANSI-C quoted strings ($'...') with proper escape handling
  processAnsiCQuotedStrings,
  // Handle $"..." (which in bash just does variable expansion, treat as regular quote)
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
