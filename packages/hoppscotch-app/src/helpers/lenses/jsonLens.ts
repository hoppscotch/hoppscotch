import { defineAsyncComponent } from "vue"
import { isJSONContentType } from "../utils/contenttypes"
import { Lens } from "./lenses"

const jsonLens: Lens = {
  lensName: "response.json",
  isSupportedContentType: isJSONContentType,
  renderer: "json",
  rendererImport: defineAsyncComponent(
    () => import("~/components/lenses/renderers/JSONLensRenderer.vue")
  ),
}

export default jsonLens
