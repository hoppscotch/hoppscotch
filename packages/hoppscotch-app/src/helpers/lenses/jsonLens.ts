import { isJSONContentType } from "../utils/contenttypes"
import { Lens } from "./lenses"

const jsonLens: Lens = {
  lensName: "response.json",
  isSupportedContentType: isJSONContentType,
  renderer: "json",
  rendererImport: () =>
    import("~/components/lenses/renderers/JSONLensRenderer.vue"),
}

export default jsonLens
