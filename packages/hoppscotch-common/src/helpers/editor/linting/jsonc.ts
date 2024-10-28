import { Node, parseTree, stripComments as stripComments_ } from "jsonc-parser"
import jsoncParse from "~/helpers/jsoncParse"
import { convertIndexToLineCh } from "../utils"
import { LinterDefinition, LinterResult } from "./linter"

// Keeps track of whether an invalid JSON entry was detected in the tree
let isInvalidJSONEntry = false

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

function convertNodeToJSON(node: Node): string {
  switch (node.type) {
    case "string":
      return JSON.stringify(node.value)
    case "null":
      return "null"
    case "array":
      if (!node.children) {
        // The original text is returned if an invalid state is detected in the tree
        isInvalidJSONEntry = true
        return ""
      }

      return `[${node.children
        .map((child) => convertNodeToJSON(child))
        .join(",")}]`
    case "number":
      return JSON.stringify(node.value)
    case "boolean":
      return JSON.stringify(node.value)
    case "object":
      if (!node.children) {
        // The original text is returned if an invalid state is detected in the tree
        isInvalidJSONEntry = true
        return ""
      }

      return `{${node.children
        .map((child) => convertNodeToJSON(child))
        .join(",")}}`
    case "property":
      if (!node.children || node.children.length !== 2) {
        // The original text is returned if an invalid state is detected in the tree
        isInvalidJSONEntry = true
        return ""
      }

      return `${JSON.stringify(node.children[0].value)}:${convertNodeToJSON(
        node.children[1]
      )}`
  }
}

function stripCommentsAndCommas(text: string): string {
  const tree = parseTree(text, undefined, {
    allowEmptyContent: true,
    allowTrailingComma: true,
  })

  // If we couldn't parse the tree, return the original text
  if (!tree) {
    return text
  }

  const transformedJSONString = convertNodeToJSON(tree)

  // Return the original text if an invalid state was detected in the tree
  return isInvalidJSONEntry ? text : transformedJSONString
}

/**
 * Removes comments from a JSON string.
 * @param jsonString The JSON string with comments.
 * @returns The JSON string without comments.
 */

export function stripComments(jsonString: string) {
  // Reset the state
  isInvalidJSONEntry = false

  return stripCommentsAndCommas(stripComments_(jsonString))
}

export default linter
