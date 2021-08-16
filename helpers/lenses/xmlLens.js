const xmlLens = {
  lensName: "response.xml",
  isSupportedContentType: (contentType) => /\bxml\b/i.test(contentType),
  renderer: "xmlres",
  rendererImport: () => import("~/components/lenses/renderers/XMLLensRenderer"),
}

export default xmlLens
