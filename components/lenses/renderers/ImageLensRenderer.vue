<template>
  <ul>
    <li>
      <img :src="imageSource" />
    </li>
  </ul>
</template>
<script>
export default {
  props: {
    response: {},
  },
  data() {
    return {
      imageSource: "",
    }
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
}
</script>
