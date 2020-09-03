const htmlLens = {
  lensName: "HTML",
  supportedContentTypes: ["text/html"],
  renderer: "htmlres",
  rendererImport: () => import("~/components/lenses/renderers/HTMLLensRenderer"),
}

export default htmlLens
