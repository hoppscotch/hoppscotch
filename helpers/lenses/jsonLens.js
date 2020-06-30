const jsonLens = {
  lensName: "JSON",
  supportedContentTypes: ["application/json", "application/hal+json", "application/vnd.api+json"],
  renderer: "json",
  rendererImport: () => import("~/components/lenses/renderers/JSONLensRenderer"),
}

export default jsonLens
