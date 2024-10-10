import { parse } from "jsonc-parser"
import jsoncParse from "~/helpers/jsoncParse"
import { convertIndexToLineCh } from "../utils"
import { LinterDefinition, LinterResult } from "./linter"

const linter: LinterDefinition = (text) => {
  try {
    jsoncParse(text)
    return Promise.resolve([])
  } catch (e: any) {
    return Promise.resolve([
      <LinterResult>{
        from: convertIndexToLineCh(text, e.start),
        to: convertIndexToLineCh(text, e.end),
        message: e.message,
        severity: "error",
      },
    ])
  }
}

/**
 * Removes comments from a JSON string.
 * @param jsonString The JSON string with comments.
 * @returns The JSON string without comments.
 */

export function stripComments(jsonString: string) {
  return JSON.stringify(parse(jsonString))
}

export default linter
