import { defineAsyncComponent } from "vue"
import { Lens } from "./lenses"
import { isJSONContentType } from "../utils/contenttypes"

/**
 * Checks if a string can be parsed as valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch (e) {
    return false
  }
}

const jsonLens: Lens = {
  lensName: "response.json",
  isSupportedContentType: (contentType) => {
    // Check if it's a standard JSON content type
    if (isJSONContentType(contentType)) return true

    // For text/plain, we'll need the response body to determine if it's JSON
    if (contentType.includes("text/plain")) {
      return true // We'll do actual JSON validation in the renderer component
    }

    return false
  },
  renderer: "json",
  rendererImport: defineAsyncComponent(
    () => import("~/components/lenses/renderers/JSONLensRenderer.vue")
  ),
}

export default jsonLens
