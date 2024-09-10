import { convertIndexToLineCh } from "../utils"
import { LinterDefinition, LinterResult } from "./linter"
import jsonParse from "~/helpers/jsonParse"

const linter: LinterDefinition = (text) => {
  try {
    const jsonString = removeComments(text)
    jsonParse(jsonString)
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

function removeComments(jsonString: string): string {
  // Remove single-line comments
  jsonString = jsonString.replace(singleLineCommentPattern, "")
  // Remove multi-line comments
  jsonString = jsonString.replace(multiLineCommentPattern, "")
  return jsonString
}

export default linter
