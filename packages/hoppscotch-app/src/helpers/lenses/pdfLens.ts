import { Lens } from "./lenses"

const pdfLens: Lens = {
  lensName: "response.pdf",
  isSupportedContentType: (contentType) =>
    /\bapplication\/pdf\b/i.test(contentType),
  renderer: "pdfres",
  rendererImport: () =>
    import("~/components/lenses/renderers/PDFLensRenderer.vue"),
}

export default pdfLens
