import { isJSONContentType } from "../utils/contenttypes"

const jsonLens = {
  lensName: "response.json",
  isSupportedContentType: isJSONContentType,
  renderer: "json",
  rendererImport: () =>
    import("~/components/lenses/renderers/JSONLensRenderer"),
}

export default jsonLens
