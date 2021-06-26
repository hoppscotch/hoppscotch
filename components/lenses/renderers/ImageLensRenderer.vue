<template>
  <div>
    <div class="row-wrapper">
      <label for="body">{{ $t("response_body") }}</label>
      <div>
        <button
          v-if="response.body"
          ref="downloadResponse"
          v-tooltip="$t('download_file')"
          class="icon button"
          @click="downloadResponse"
        >
          <i class="material-icons">save_alt</i>
        </button>
      </div>
    </div>
    <div id="response-details-wrapper">
      <img class="max-w-full" :src="imageSource" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    response: { type: Object, default: () => {} },
  },
  data() {
    return {
      imageSource: "",
      doneButton: '<i class="material-icons">done</i>',
      downloadButton: '<i class="material-icons">save_alt</i>',
    }
  },
  computed: {
    responseType() {
      return (this.response.headers["content-type"] || "")
        .split(";")[0]
        .toLowerCase()
    },
  },
  watch: {
    response: {
      immediate: true,
      handler() {
        this.imageSource = ""

        const buf = this.response.body
        const bytes = new Uint8Array(buf)
        const blob = new Blob([bytes.buffer])

        const reader = new FileReader()
        reader.onload = ({ target }) => {
          this.imageSource = target.result
        }
        reader.readAsDataURL(blob)
      },
    },
  },
  mounted() {
    this.imageSource = ""

    const buf = this.response.body
    const bytes = new Uint8Array(buf)
    const blob = new Blob([bytes.buffer])

    const reader = new FileReader()
    reader.onload = ({ target }) => {
      this.imageSource = target.result
    }
    reader.readAsDataURL(blob)
  },
  methods: {
    downloadResponse() {
      const dataToWrite = this.response.body
      const file = new Blob([dataToWrite], { type: this.responseType })
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
  },
}
</script>
