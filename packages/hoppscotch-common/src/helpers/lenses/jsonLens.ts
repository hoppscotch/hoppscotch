import { defineAsyncComponent } from "vue"
import { Lens } from "./lenses"
import { isJSONContentType } from "../utils/contenttypes"

/**
 * Checks if response body contents can be parsed as valid JSON
 */
export function isValidJSONResponse(contents: string | ArrayBuffer): boolean {
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
    JSON.parse(resolvedStr)
    return true
  } catch (e) {
    return false
  }
}

const jsonLens: Lens = {
  lensName: "response.json",
  isSupportedContentType: isJSONContentType,
  renderer: "json",
  rendererImport: defineAsyncComponent(
    () => import("~/components/lenses/renderers/JSONLensRenderer.vue")
  ),
}

export default jsonLens
