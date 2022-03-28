import { Lens } from "./lenses"

const rawLens: Lens = {
  lensName: "response.raw",
  isSupportedContentType: () => true,
  renderer: "raw",
  rendererImport: () =>
    import("~/components/lenses/renderers/RawLensRenderer.vue"),
}

export default rawLens
