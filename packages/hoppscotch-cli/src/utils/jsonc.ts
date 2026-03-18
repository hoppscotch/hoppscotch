import { Node, parseTree, stripComments as stripComments_ } from "jsonc-parser";

/**
 * An internal error that is thrown when an invalid JSONC node configuration
 * is encountered
 */
class InvalidJSONCNodeError extends Error {
  constructor() {
    super();
    this.message = "Invalid JSONC node";
  }
}

// NOTE: If we choose to export this function, do refactor it to return a result discriminated union instead of throwing
/**
 * @throws {InvalidJSONCNodeError} if the node is in an invalid configuration
 * @returns The JSON string without comments and trailing commas
 */
function convertNodeToJSON(node: Node): string {
  switch (node.type) {
    case "string":
      return JSON.stringify(node.value);
    case "null":
      return "null";
    case "array":
      if (!node.children) {
        throw new InvalidJSONCNodeError();
      }

      return `[${node.children
        .map((child) => convertNodeToJSON(child))
        .join(",")}]`;
    case "number":
      return JSON.stringify(node.value);
    case "boolean":
      return JSON.stringify(node.value);
    case "object":
      if (!node.children) {
        throw new InvalidJSONCNodeError();
      }

      return `{${node.children
        .map((child) => convertNodeToJSON(child))
        .join(",")}}`;
    case "property":
      if (!node.children || node.children.length !== 2) {
        throw new InvalidJSONCNodeError();
      }

      const [keyNode, valueNode] = node.children;

      // Use keyNode.value instead of keyNode to avoid circular references.
      // Attempting to JSON.stringify(keyNode) directly would throw
      // "Converting circular structure to JSON" error.
      // If the valueNode configuration is wrong, this will return an error, which will propagate up
      return `${JSON.stringify(keyNode.value)}:${convertNodeToJSON(valueNode)}`;
  }
}

function stripCommentsAndCommas(text: string): string {
  const tree = parseTree(text, undefined, {
    allowEmptyContent: true,
    allowTrailingComma: true,
  });

  // If we couldn't parse the tree, return the original text
  if (!tree) {
    return text;
  }

  // convertNodeToJSON can throw an error if the tree is invalid
  try {
    return convertNodeToJSON(tree);
  } catch (_) {
    return text;
  }
}

/**
 * Removes comments and trailing commas from a JSONC string.
 * This is needed because APIs like AWS Cognito expect valid JSON without comments,
 * but Hoppscotch allows users to add comments to their request bodies.
 *
 * @param jsoncString The JSONC string with comments and/or trailing commas.
 * @returns The clean JSON string without comments or trailing commas.
 */
export function stripComments(jsoncString: string): string {
  return stripCommentsAndCommas(stripComments_(jsoncString) ?? jsoncString);
}
