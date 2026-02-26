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
 * Remove curl output/display flags (-s, -S, -v, -i, -sS, --silent, etc.) that don't
 * affect the HTTP request. Only strips when outside quotes so header/data/URL
 * content is never touched.
 */
const removeCurlOutputFlags = (curlCmd: string): string => {
  let i = 0
  const out: string[] = []
  let inQuote: "'" | '"' | null = null

  while (i < curlCmd.length) {
    const rest = curlCmd.slice(i)

    if (inQuote === null) {
      // Outside quotes: strip output flags only
      const combined = rest.match(/^ -([sSv]+)(?=\s)/)
      if (combined && /^[sSv]+$/.test(combined[1])) {
        out.push(" ")
        i += combined[0].length
        continue
      }
      if (/^ -s(?=\s)/.test(rest)) { out.push(" "); i += 4; continue }
      if (/^ -S(?=\s)/.test(rest)) { out.push(" "); i += 4; continue }
      if (/^ -v(?=\s)/.test(rest)) { out.push(" "); i += 4; continue }
      if (/^ -i(?=\s)/.test(rest)) { out.push(" "); i += 4; continue }
      const long = rest.match(/^ --(silent|show-error|verbose|include|progress-bar|no-progress-meter)(?=\s)/)
      if (long) { out.push(" "); i += long[0].length; continue }
      if (rest[0] === "'" || rest[0] === '"') {
        inQuote = rest[0]
        out.push(rest[0])
        i += 1
        continue
      }
    } else if (inQuote === "'") {
      out.push(rest[0])
      if (rest[0] === "'") inQuote = null
      i += 1
      continue
    } else {
      if (rest[0] === "\\" && rest.length > 1) { out.push(rest[0], rest[1]); i += 2; continue }
      out.push(rest[0])
      if (rest[0] === '"') inQuote = null
      i += 1
      continue
    }

    out.push(rest[0])
    i += 1
  }

  return out.join("")
}

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
      flow(
        paperCuts,
        replaceLongOptions,
        prescreenXArgs,
        removeCurlOutputFlags
      )
    ),
    O.getOrElse(() => "")
  )
