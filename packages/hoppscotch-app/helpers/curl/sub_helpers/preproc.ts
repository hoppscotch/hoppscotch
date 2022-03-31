import { pipe, flow } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as O from "fp-ts/Option"

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
  S.replace(/\n/g, ""),
  // remove all $ symbols from start of argument values
  S.replace(/\$'/g, "'"),
  S.replace(/\$"/g, '"')
)

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

/**
 * Sanitizes curl string
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
        // replace string for insomnia
        (curlCmd) => {
          Object.keys(replaceables).map(
            (r) => (curlCmd = replaceFunction(curlCmd, r))
          )
          return curlCmd
        },
        // yargs parses -XPOST as separate arguments. just prescreen for it.
        S.replace(
          / -X(GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE)/,
          " -X $1"
        ),
        S.trim
      )
    ),
    O.getOrElse(() => "")
  )
