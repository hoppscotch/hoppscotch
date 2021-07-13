<template>
  <div>
    <div
      class="
        flex flex-1
        sticky
        top-23
        z-10
        bg-primary
        items-center
        justify-between
        border-b border-divider
      "
    >
      <label for="body" class="px-4 font-semibold text-xs">
        {{ $t("response_body") }}
      </label>
      <div>
        <ButtonSecondary
          v-if="response.body"
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('download_file')"
          :icon="downloadIcon"
          @click.native="downloadResponse"
        />
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
  },
}
</script>
