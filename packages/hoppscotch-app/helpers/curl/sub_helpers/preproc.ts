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
export function preProcessCurlCommand(curlCommand: string) {
  // remove '\' and newlines
  curlCommand = curlCommand.replace(/ ?\\ ?$/gm, " ")
  curlCommand = curlCommand.replace(/\n/g, "")

  // remove all $ symbols from start of argument values
  curlCommand = curlCommand.replaceAll("$'", "'")
  curlCommand = curlCommand.replaceAll('$"', '"')

  // replace string for insomnia
  for (const r in replaceables) {
    if (r.includes("data") || r.includes("form") || r.includes("header")) {
      curlCommand = curlCommand.replaceAll(
        RegExp(`[ \t]${r}(["' ])`, "g"),
        ` ${replaceables[r]}$1`
      )
    } else {
      curlCommand = curlCommand.replace(
        RegExp(`[ \t]${r}(["' ])`),
        ` ${replaceables[r]}$1`
      )
    }
  }

  // yargs parses -XPOST as separate arguments. just prescreen for it.
  curlCommand = curlCommand.replace(
    / -X(GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE|CUSTOM)/,
    " -X $1"
  )
  curlCommand = curlCommand.trim()

  return curlCommand
}
