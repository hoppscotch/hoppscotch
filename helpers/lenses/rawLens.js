const rawLens = {
  lensName: "Raw",
  supportedContentTypes: null,
  renderer: "raw",
  rendererImport: () => import("~/components/lenses/renderers/RawLensRenderer"),
}

export default rawLens
