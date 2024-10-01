import { convertIndexToLineCh } from "../utils"
import { LinterDefinition, LinterResult } from "./linter"
import jsoncParse from "~/helpers/jsoncParse"

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

const singleLineCommentPattern = /\/\/.*$/gm
const multiLineCommentPattern = /\/\*[\s\S]*?\*\//gm

export function removeComments(jsonString: string): string {
  // Remove single-line comments
  jsonString = jsonString.replace(singleLineCommentPattern, "")
  // Remove multi-line comments
  jsonString = jsonString.replace(multiLineCommentPattern, "")

  jsonString = removeTrailingCommas(jsonString)

  return jsonString
}

export function removeTrailingCommas(jsonString: string): string {
  return jsonString.replace(/,(?=\s*?[\]}])/g, "")
}

export default linter
