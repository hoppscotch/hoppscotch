const xmlLens = {
  lensName: "XML",
  supportedContentTypes: [],
  supportContentTypesRegExp: /\bxml\b/i,
  renderer: "xmlres",
  rendererImport: () => import("~/components/lenses/renderers/XMLLensRenderer"),
}

export default xmlLens
