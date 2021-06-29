<template>
  <div>
    <div class="row-wrapper">
      <label for="body">{{ $t("response_body") }}</label>
      <div>
        <button
          v-if="response.body"
          ref="ToggleExpandResponse"
          v-tooltip="{
            content: !expandResponse
              ? $t('expand_response')
              : $t('collapse_response'),
          }"
          class="icon button"
          @click="ToggleExpandResponse"
        >
          <i class="material-icons">
            {{ !expandResponse ? "unfold_more" : "unfold_less" }}
          </i>
        </button>
        <button
          v-if="response.body && canDownloadResponse"
          ref="downloadResponse"
          v-tooltip="$t('download_file')"
          class="icon button"
          @click="downloadResponse"
        >
          <i class="material-icons">{{ downloadIcon }}</i>
        </button>
        <button
          v-if="response.body"
          ref="copyResponse"
          v-tooltip="$t('copy_response')"
          class="icon button"
          @click="copyResponse"
        >
          <i class="material-icons">{{ copyIcon }}</i>
        </button>
      </div>
    </div>
    <div id="response-details-wrapper">
      <SmartAceEditor
        :value="responseBodyText"
        :lang="'plain_text'"
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
    </div>
  </div>
</template>

<script>
import TextContentRendererMixin from "./mixins/TextContentRendererMixin"
import { isJSONContentType } from "~/helpers/utils/contenttypes"

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
    }
  },
  computed: {
    responseType() {
      return (this.response.headers["content-type"] || "")
        .split(";")[0]
        .toLowerCase()
    },
    canDownloadResponse() {
      return (
        this.response &&
        this.response.headers &&
        this.response.headers["content-type"] &&
        isJSONContentType(this.response.headers["content-type"])
      )
    },
  },
  methods: {
    ToggleExpandResponse() {
      this.expandResponse = !this.expandResponse
      this.responseBodyMaxLines =
        this.responseBodyMaxLines === Infinity ? 16 : Infinity
    },
    downloadResponse() {
      const dataToWrite = this.responseBodyText
      const file = new Blob([dataToWrite], { type: this.responseType })
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
  },
}
</script>
