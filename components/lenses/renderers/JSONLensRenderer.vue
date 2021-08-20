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
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.download_file')"
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
        :value="jsonBodyText"
        :lang="'json'"
        :provide-outline="true"
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
    }
  },
  computed: {
    jsonBodyText() {
      try {
        return JSON.stringify(JSON.parse(this.responseBodyText), null, 2)
      } catch (e) {
        // Most probs invalid JSON was returned, so drop prettification (should we warn ?)
        return this.responseBodyText
      }
    },
    responseType() {
      return (
        this.response.headers.find(
          (h) => h.key.toLowerCase() === "content-type"
        ).value || ""
      )
        .split(";")[0]
        .toLowerCase()
    },
  },
  methods: {
    downloadResponse() {
      const dataToWrite = this.responseBodyText
      const file = new Blob([dataToWrite], { type: "application/json" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url
      // TODO get uri from meta
      a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}`
      document.body.appendChild(a)
      a.click()
      this.downloadIcon = "done"
      this.$toast.success(this.$t("state.download_started"), {
        icon: "downloading",
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
      this.$toast.success(this.$t("state.copied_to_clipboard"), {
        icon: "content_paste",
      })
      setTimeout(() => (this.copyIcon = "content_copy"), 1000)
    },
  },
}
</script>
