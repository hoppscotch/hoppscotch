const rawLens = {
  lensName: "Raw",
  isSupportedContentType: () => true,
  renderer: "raw",
  rendererImport: () => import("~/components/lenses/renderers/RawLensRenderer"),
}

export default rawLens
