import { defineAsyncComponent } from "vue"
import { Lens } from "./lenses"

const rawLens: Lens = {
  lensName: "response.raw",
  isSupportedContentType: () => true,
  renderer: "raw",
  rendererImport: defineAsyncComponent(
    () => import("~/components/lenses/renderers/RawLensRenderer.vue")
  ),
}

export default rawLens
