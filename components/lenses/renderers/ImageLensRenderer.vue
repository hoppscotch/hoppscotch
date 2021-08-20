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
      </div>
    </div>
    <div class="flex relative">
      <img
        class="border-b border-dividerLight flex max-w-full flex-1"
        :src="imageSource"
      />
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
      return (
        this.response.headers.find(
          (h) => h.key.toLowerCase() === "content-type"
        ).value || ""
      )
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
      this.$toast.success(this.$t("state.download_started"), {
        icon: "downloading",
      })
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        this.downloadIcon = "save_alt"
      }, 1000)
    },
  },
}
</script>
