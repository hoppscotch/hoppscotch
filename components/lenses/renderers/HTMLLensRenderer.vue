<template>
  <div>
    <div class="flex flex-1">
      <label for="body">{{ $t("response_body") }}</label>
      <div>
        <ButtonSecondary
          v-if="response.body"
          ref="ToggleExpandResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="
            !expandResponse ? $t('expand_response') : $t('collapse_response')
          "
          :icon="!expandResponse ? 'unfold_more' : 'unfold_less'"
          @click.native="ToggleExpandResponse"
        />
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="previewEnabled ? $t('hide_preview') : $t('preview_html')"
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
          :title="$t('copy_response')"
          :icon="copyIcon"
          @click.native="copyResponse"
        />
      </div>
    </div>
    <div id="response-details-wrapper">
      <SmartAceEditor
        :value="responseBodyText"
        :lang="'html'"
        :options="{
          maxLines: responseBodyMaxLines,
          minLines: '16',
          fontSize: '15px',
          autoScrollEditorIntoView: true,
          readOnly: true,
          showPrintMargin: false,
          useWorker: false,
        }"
        styles="rounded-b-lg"
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

export default {
  mixins: [TextContentRendererMixin],
  props: {
    response: { type: Object, default: () => {} },
  },
  data() {
    return {
      expandResponse: false,
      responseBodyMaxLines: 16,
      downloadIcon: "save_alt",
      copyIcon: "content_copy",
      previewEnabled: false,
    }
  },
  methods: {
    ToggleExpandResponse() {
      this.expandResponse = !this.expandResponse
      this.responseBodyMaxLines =
        this.responseBodyMaxLines === Infinity ? 16 : Infinity
    },
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
        window.URL.revokeObjectURL(url)
        this.downloadIcon = "save_alt"
      }, 1000)
    },
    copyResponse() {
      const aux = document.createElement("textarea")
      const copy = this.responseBodyText
      aux.innerText = copy
      document.body.appendChild(aux)
      aux.select()
      document.execCommand("copy")
      document.body.removeChild(aux)
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
