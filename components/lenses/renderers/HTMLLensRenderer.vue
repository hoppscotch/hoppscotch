<template>
  <div>
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-lowerSecondaryStickyFold
        pl-4
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-secondaryLight">
        {{ $t("response.body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="previewEnabled ? $t('hide.preview') : $t('preview_html')"
          :icon="!previewEnabled ? 'visibility' : 'visibility_off'"
          @click.native.prevent="togglePreview"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('download_file')"
          :icon="downloadIcon"
          @click.native="downloadResponse"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="copyResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.copy')"
          :icon="copyIcon"
          @click.native="copyResponse"
        />
      </div>
    </div>
    <div class="relative">
      <SmartAceEditor
        :value="responseBodyText"
        :lang="'html'"
        :options="{
          maxLines: Infinity,
          minLines: 16,
          autoScrollEditorIntoView: true,
          readOnly: true,
          showPrintMargin: false,
          useWorker: false,
        }"
        styles="border-b border-dividerLight"
      />
      <iframe
        ref="previewFrame"
        :class="{ hidden: !previewEnabled }"
        class="covers-response"
        src="about:blank"
      ></iframe>
    </div>
  </div>
</template>

<script>
import TextContentRendererMixin from "./mixins/TextContentRendererMixin"
import { copyToClipboard } from "~/helpers/utils/clipboard"

export default {
  mixins: [TextContentRendererMixin],
  props: {
    response: { type: Object, default: () => {} },
  },
  data() {
    return {
      downloadIcon: "save_alt",
      copyIcon: "content_copy",
      previewEnabled: false,
    }
  },
  methods: {
    downloadResponse() {
      const dataToWrite = this.responseBodyText
      const file = new Blob([dataToWrite], { type: "text/html" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url
      // TODO get uri from meta
      a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}`
      document.body.appendChild(a)
      a.click()
      this.downloadIcon = "done"
      this.$toast.success(this.$t("download_started"), {
        icon: "done",
      })
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        this.downloadIcon = "save_alt"
      }, 1000)
    },
    copyResponse() {
      copyToClipboard(this.responseBodyText)
      this.copyIcon = "done"
      this.$toast.success(this.$t("copied_to_clipboard"), {
        icon: "done",
      })
      setTimeout(() => (this.copyIcon = "content_copy"), 1000)
    },
    togglePreview() {
      this.previewEnabled = !this.previewEnabled
      if (this.previewEnabled) {
        if (
          this.$refs.previewFrame.getAttribute("data-previewing-url") ===
          this.url
        )
          return
        // Use DOMParser to parse document HTML.
        const previewDocument = new DOMParser().parseFromString(
          this.responseBodyText,
          "text/html"
        )
        // Inject <base href="..."> tag to head, to fix relative CSS/HTML paths.
        previewDocument.head.innerHTML =
          `<base href="${this.url}">` + previewDocument.head.innerHTML
        // Finally, set the iframe source to the resulting HTML.
        this.$refs.previewFrame.srcdoc =
          previewDocument.documentElement.outerHTML
        this.$refs.previewFrame.setAttribute("data-previewing-url", this.url)
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.covers-response {
  @apply absolute;
  @apply inset-0;
  @apply bg-white;
  @apply h-full;
  @apply w-full;
  @apply border;
  @apply border-dividerLight;
}
</style>
