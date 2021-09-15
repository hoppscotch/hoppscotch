import { Lens } from "./lenses"

const imageLens: Lens = {
  lensName: "response.image",
  isSupportedContentType: (contentType) =>
    /\bimage\/(?:gif|jpeg|png|bmp|svg\+xml|x-icon|vnd\.microsoft\.icon)\b/i.test(
      contentType
    ),
  renderer: "imageres",
  rendererImport: () =>
    import("~/components/lenses/renderers/ImageLensRenderer.vue"),
}

export default imageLens
