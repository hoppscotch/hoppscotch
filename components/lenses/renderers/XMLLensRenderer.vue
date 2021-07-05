<template>
  <div>
    <div class="row-wrapper">
      <label for="body">{{ $t("response_body") }}</label>
      <div>
        <ButtonSecondary
          v-if="response.body"
          ref="ToggleExpandResponse"
          v-tippy="{ theme: 'tooltip' }"
          title="{
            content: !expandResponse
              ? $t('expand_response')
              : $t('collapse_response'),
          }"
          :icon="!expandResponse ? 'unfold_more' : 'unfold_less'"
          @click.native="ToggleExpandResponse"
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
        :lang="'xml'"
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

export default {
  mixins: [TextContentRendererMixin],
  props: {
    response: { type: Object, default: () => {} },
  },
  data() {
    return {
      expandResponse: false,
      responseBodyMaxLines: 16,
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
