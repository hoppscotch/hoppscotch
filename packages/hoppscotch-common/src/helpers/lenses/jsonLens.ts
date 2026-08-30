import { defineAsyncComponent } from "vue"
import { Lens } from "./lenses"
import { isJSONContentType } from "../utils/contenttypes"
import { isBodyTooLargeForJsonPreview } from "./responseBodySize"

/**
 * Checks if response body contents can be parsed as valid JSON.
 * Oversized bodies skip decode + JSON.parse so lens detection cannot freeze
 * the UI on 100+ MB payloads.
 */
export function isValidJSONResponse(contents: string | ArrayBuffer): boolean {
  if (!contents) {
    return false
  }

  if (isBodyTooLargeForJsonPreview(contents)) {
    return false
  }

  const resolvedStr =
    typeof contents === "string"
      ? contents
      : new TextDecoder("utf-8").decode(contents).replace(/\0+$/, "")

  if (!resolvedStr.trim()) {
    return false
  }

  try {
    JSON.parse(resolvedStr)
    return true
  } catch (_e) {
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
