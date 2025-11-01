import { execFile } from "child_process"
import * as path from "path"

const HOPP_EXECUTABLE_PATH = path.resolve(
  __dirname,
  "../../bin/hopp-cli.js"
)

export const execHopp = (args: string) => {
  const argsArr = args.split(" ").filter((arg) => arg.length > 0)

  return new Promise((resolve) => {
    execFile(
      "node",
      [HOPP_EXECUTABLE_PATH, ...argsArr],
      (error, stdout, stderr) => {
        resolve({
          code: error && error.code ? error.code : 0,
          error,
          stdout,
          stderr,
        })
      }
    )
  })
}
