import RegexWorker from "~/assets/js/regex.worker"

export default (context, inject) => {
  inject("worker", {
    createRejexWorker() {
      return new RegexWorker()
    },
  })
}
