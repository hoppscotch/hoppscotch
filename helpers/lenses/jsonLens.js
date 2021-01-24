const jsonLens = {
  lensName: "JSON",
  supportedContentTypes: [],
  supportContentTypesRegExp: /\bjson\b/i,
  renderer: "json",
  rendererImport: () => import("~/components/lenses/renderers/JSONLensRenderer"),
}

export default jsonLens
