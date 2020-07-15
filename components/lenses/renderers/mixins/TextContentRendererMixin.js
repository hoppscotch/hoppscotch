export default {
  props: {
    response: {},
  },
  computed: {
    responseBodyText() {
      return new TextDecoder("utf-8").decode(this.response.body)
    },
  },
}
