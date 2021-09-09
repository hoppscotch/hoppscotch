import RegexWorker from "~/assets/js/regex.worker"

export default (_, inject) => {
  inject("worker", {
    createRejexWorker() {
      return new RegexWorker()
    },
  })
}
