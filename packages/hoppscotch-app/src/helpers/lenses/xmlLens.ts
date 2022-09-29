import { defineAsyncComponent } from "vue"
import { Lens } from "./lenses"

const xmlLens: Lens = {
  lensName: "response.xml",
  isSupportedContentType: (contentType) => /\bxml\b/i.test(contentType),
  renderer: "xmlres",
  rendererImport: defineAsyncComponent(
    () => import("~/components/lenses/renderers/XMLLensRenderer.vue")
  ),
}

export default xmlLens
