<template>
  <div>
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-lowerSecondaryStickyFold
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label for="body" class="font-semibold px-4">
        {{ $t("response_body") }}
      </label>
      <div class="flex">
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
    <div id="response-details-wrapper">
      <SmartAceEditor
        :value="responseBodyText"
        :lang="'xml'"
        :options="{
          maxLines: Infinity,
          minLines: 16,
          fontSize: '12px',
          autoScrollEditorIntoView: true,
          readOnly: true,
          showPrintMargin: false,
          useWorker: false,
        }"
      />
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
      copyIcon: "content_copy",
      downloadIcon: "save_alt",
    }
  },
  computed: {
    responseType() {
      return (this.response.headers["content-type"] || "")
        .split(";")[0]
        .toLowerCase()
    },
  },
  methods: {
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
  },
}
</script>
