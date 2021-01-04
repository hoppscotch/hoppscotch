<template>
  <div>
    <div class="row-wrapper">
      <label for="body">{{ $t("response") }}</label>
      <div>
        <button
          class="icon"
          @click="ToggleExpandResponse"
          ref="ToggleExpandResponse"
          v-if="response.body"
          v-tooltip="{
            content: !expandResponse ? $t('expand_response') : $t('collapse_response'),
          }"
        >
          <i class="material-icons">
            {{ !expandResponse ? "unfold_more" : "unfold_less" }}
          </i>
        </button>
        <button
          v-if="response.body"
          class="icon"
          @click.prevent="togglePreview"
          v-tooltip="{
            content: previewEnabled ? $t('hide_preview') : $t('preview_html'),
          }"
        >
          <i class="material-icons">
            {{ !previewEnabled ? "visibility" : "visibility_off" }}
          </i>
        </button>
        <button
          class="icon"
          @click="downloadResponse"
          ref="downloadResponse"
          v-if="response.body"
          v-tooltip="$t('download_file')"
        >
          <i class="material-icons">save_alt</i>
        </button>
        <button
          class="icon"
          @click="copyResponse"
          ref="copyResponse"
          v-if="response.body"
          v-tooltip="$t('copy_response')"
        >
          <i class="material-icons">content_copy</i>
        </button>
      </div>
    </div>
    <div id="response-details-wrapper">
      <ace-editor
        :value="responseBodyText"
        :lang="'html'"
        :options="{
          maxLines: responseBodyMaxLines,
          minLines: '16',
          fontSize: '16px',
          autoScrollEditorIntoView: true,
          readOnly: true,
          showPrintMargin: false,
          useWorker: false,
        }"
        styles="rounded-b-lg"
      />
      <iframe
        :class="{ hidden: !previewEnabled }"
        class="covers-response"
        ref="previewFrame"
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
    response: {},
  },
  data() {
    return {
      expandResponse: false,
      responseBodyMaxLines: 16,
      doneButton: '<i class="material-icons">done</i>',
      downloadButton: '<i class="material-icons">save_alt</i>',
      copyButton: '<i class="material-icons">content_copy</i>',
      previewEnabled: false,
    }
  },
  methods: {
    ToggleExpandResponse() {
      this.expandResponse = !this.expandResponse
      this.responseBodyMaxLines = this.responseBodyMaxLines == Infinity ? 16 : Infinity
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
      this.$refs.downloadResponse.innerHTML = this.doneButton
      this.$toast.success(this.$t("download_started"), {
        icon: "done",
      })
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        this.$refs.downloadResponse.innerHTML = this.downloadButton
      }, 1000)
    },
    copyResponse() {
      this.$refs.copyResponse.innerHTML = this.doneButton
      this.$toast.success(this.$t("copied_to_clipboard"), {
        icon: "done",
      })
      const aux = document.createElement("textarea")
      const copy = this.responseBodyText
      aux.innerText = copy
      document.body.appendChild(aux)
      aux.select()
      document.execCommand("copy")
      document.body.removeChild(aux)
      setTimeout(() => (this.$refs.copyResponse.innerHTML = this.copyButton), 1000)
    },
    togglePreview() {
      this.previewEnabled = !this.previewEnabled
      if (this.previewEnabled) {
        if (this.$refs.previewFrame.getAttribute("data-previewing-url") === this.url) return
        // Use DOMParser to parse document HTML.
        const previewDocument = new DOMParser().parseFromString(this.responseBodyText, "text/html")
        // Inject <base href="..."> tag to head, to fix relative CSS/HTML paths.
        previewDocument.head.innerHTML =
          `<base href="${this.url}">` + previewDocument.head.innerHTML
        // Finally, set the iframe source to the resulting HTML.
        this.$refs.previewFrame.srcdoc = previewDocument.documentElement.outerHTML
        this.$refs.previewFrame.setAttribute("data-previewing-url", this.url)
      }
    },
  },
}
</script>
