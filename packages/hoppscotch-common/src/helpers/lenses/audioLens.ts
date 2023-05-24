import { defineAsyncComponent } from "vue"
import { Lens } from "./lenses"

const audioLens: Lens = {
  lensName: "response.audio",
  isSupportedContentType: (contentType) =>
    /\baudio\/(?:wav|mpeg|mp4|aac|aacp|ogg|webm|x-caf|flac|mp3|)\b/i.test(
      contentType
    ),
  renderer: "audiores",
  rendererImport: defineAsyncComponent(
    () => import("~/components/lenses/renderers/AudioLensRenderer.vue")
  ),
}

export default audioLens
