<template>
  <ul>
    <li>
      <div class="flex-wrap">
        <label for="body">{{ $t("response") }}</label>
        <div>
          <button
            class="icon"
            @click="downloadResponse"
            ref="downloadResponse"
            v-if="response.body"
            v-tooltip="$t('download_file')"
          >
            <i class="material-icons">save_alt</i>
          </button>
        </div>
      </div>
      <div id="response-details-wrapper">
        <img class="response-image" :src="imageSource" />
      </div>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.response-image {
  max-width: 100%;
}
</style>

<script>
export default {
  props: {
    response: {},
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
      return (this.response.headers["content-type"] || "").split(";")[0].toLowerCase()
    },
  },
  watch: {
    response: {
      immediate: true,
      handler(newValue) {
        this.imageSource = ""

        const buf = this.response.body
        const bytes = new Uint8Array(buf)
        const blob = new Blob([bytes.buffer])

        const reader = new FileReader()
        reader.onload = (e) => {
          this.imageSource = e.target.result
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
    reader.onload = (e) => {
      this.imageSource = e.target.result
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
      a.download = `response on ${Date()}`.replace(/\./g, "[dot]")
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
