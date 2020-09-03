export default {
  props: {
    response: {},
  },
  computed: {
    responseBodyText() {
      if (typeof this.response.body === "string") return this.response.body
      return new TextDecoder("utf-8").decode(this.response.body)
    },
  },
}
