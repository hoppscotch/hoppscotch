const rawLens = {
  lensName: "response.raw",
  isSupportedContentType: () => true,
  renderer: "raw",
  rendererImport: () => import("~/components/lenses/renderers/RawLensRenderer"),
}

export default rawLens
