import { defineAsyncComponent } from "vue"
import { Lens } from "./lenses"
import { isJSONContentType } from "../utils/contenttypes"

/**
 * Checks if response body is a valid array of objects (tabular data)
 */
export function isTabularJSONResponse(contents: string | ArrayBuffer): boolean {
  if (!contents) {
    return false
  }

  const resolvedStr =
    contents instanceof ArrayBuffer
      ? new TextDecoder("utf-8").decode(contents)
      : contents

  if (!resolvedStr.trim()) {
    return false
  }

  try {
    const parsed = JSON.parse(resolvedStr)

    // Check if it's an array
    if (!Array.isArray(parsed)) {
      return false
    }

    // Check if array is not empty and contains objects
    if (parsed.length === 0) {
      return false
    }

    // Check if at least the first item is an object (not primitive)
    const firstItem = parsed[0]
    if (
      typeof firstItem !== "object" ||
      firstItem === null ||
      Array.isArray(firstItem)
    ) {
      return false
    }

    // Check if the object has at least one key
    if (Object.keys(firstItem).length === 0) {
      return false
    }

    return true
  } catch (e) {
    return false
  }
}

const tableLens: Lens = {
  lensName: "response.table",
  isSupportedContentType: (contentType) => {
    // Table lens only supports JSON content types
    return isJSONContentType(contentType)
  },
  renderer: "table",
  rendererImport: defineAsyncComponent(
    () => import("~/components/lenses/renderers/TableLensRenderer.vue")
  ),
}

export default tableLens
