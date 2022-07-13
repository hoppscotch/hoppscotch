export default {
  props: {
    response: {},
  },
  computed: {
    responseBodyText() {
      if (typeof this.response.body === "string") return this.response.body
      else {
        const res = new TextDecoder("utf-8").decode(this.response.body)

        // HACK: Temporary trailing null character issue from the extension fix
        return res.replace(/\0+$/, "")
      }
    },
  },
}
