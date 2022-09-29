import { defineAsyncComponent } from "vue"
import { Lens } from "./lenses"

const htmlLens: Lens = {
  lensName: "response.html",
  isSupportedContentType: (contentType) =>
    /\btext\/html|application\/xhtml\+xml\b/i.test(contentType),
  renderer: "htmlres",
  rendererImport: defineAsyncComponent(
    () => import("~/components/lenses/renderers/HTMLLensRenderer.vue")
  ),
}

export default htmlLens
