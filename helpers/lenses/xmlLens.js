const xmlLens = {
  lensName: "XML",
  supportedContentTypes: ["application/xml", "image/svg+xml", "text/xml", "application/rss+xml"],
  renderer: "xmlres",
  rendererImport: () => import("~/components/lenses/renderers/XMLLensRenderer"),
}

export default xmlLens
