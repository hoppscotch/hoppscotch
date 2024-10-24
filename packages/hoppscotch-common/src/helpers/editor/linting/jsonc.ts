import { Node, parseTree, stripComments as stripComments_ } from "jsonc-parser"
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

function convertNodeToJSON(node: Node): string {
  switch (node.type) {
    case "string":
      return JSON.stringify(node.value)
    case "null":
      return "null"
    case "array":
      return `[${node
        .children!.map((child) => convertNodeToJSON(child))
        .join(",")}]`
    case "number":
      return JSON.stringify(node.value)
    case "boolean":
      return JSON.stringify(node.value)
    case "object":
      return `{${node
        .children!.map((child) => convertNodeToJSON(child))
        .join(",")}}`
    case "property":
      if (!node.children || node.children.length !== 2) {
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

  return convertNodeToJSON(tree)
}

/**
 * Removes comments from a JSON string.
 * @param jsonString The JSON string with comments.
 * @returns The JSON string without comments.
 */

export function stripComments(jsonString: string) {
  return stripCommentsAndCommas(stripComments_(jsonString))
}

export default linter
