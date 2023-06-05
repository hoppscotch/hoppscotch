import { defineAsyncComponent } from "vue"
import { Lens } from "./lenses"

const videoLens: Lens = {
  lensName: "response.video",
  isSupportedContentType: (contentType) =>
    /\bvideo\/(?:webm|x-m4v|quicktime|x-ms-wmv|x-flv|mpeg|x-msvideo|x-ms-asf|mp4|)\b/i.test(
      contentType
    ),
  renderer: "videores",
  rendererImport: defineAsyncComponent(
    () => import("~/components/lenses/renderers/VideoLensRenderer.vue")
  ),
}

export default videoLens
