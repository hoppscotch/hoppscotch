const htmlLens = {
  lensName: "HTML",
  isSupportedContentType: (contentType) =>
    /\btext\/html|application\/xhtml\+xml\b/i.test(contentType),
  renderer: "htmlres",
  rendererImport: () => import("~/components/lenses/renderers/HTMLLensRenderer"),
}

export default htmlLens
