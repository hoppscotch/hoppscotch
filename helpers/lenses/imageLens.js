const imageLens = {
  lensName: "Image",
  supportedContentTypes: [
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/bmp",
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",
  ],
  renderer: "imageres",
  rendererImport: () => import("~/components/lenses/renderers/ImageLensRenderer"),
}

export default imageLens
