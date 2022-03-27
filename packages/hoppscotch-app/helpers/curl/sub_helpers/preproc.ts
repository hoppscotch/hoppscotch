import { pipe, flow } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as A from "fp-ts/Array"
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
        // remove '\' and newlines
        S.replace(/ ?\\ ?$/gm, " "),
        S.replace(/\n/g, ""),
        // remove all $ symbols from start of argument values
        S.replace(/\$'/g, "'"),
        S.replace(/\$"/g, '"'),
        // replace string for insomnia
        (curlCmd) => {
          pipe(
            Object.keys(replaceables),
            A.map(
              (r) =>
                (curlCmd = pipe(
                  curlCmd,
                  O.fromPredicate(
                    () =>
                      r.includes("data") ||
                      r.includes("form") ||
                      r.includes("header")
                  ),
                  O.map(
                    S.replace(
                      RegExp(`[ \t]${r}(["' ])`, "g"),
                      ` ${replaceables[r]}$1`
                    )
                  ),
                  O.alt(() =>
                    pipe(
                      curlCmd,
                      S.replace(
                        RegExp(`[ \t]${r}(["' ])`),
                        ` ${replaceables[r]}$1`
                      ),
                      O.of
                    )
                  ),
                  O.getOrElse(() => "")
                ))
            )
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
