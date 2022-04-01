import "@nuxt/types/app"

declare module "@nuxt/types/app" {
  interface NuxtApp {
    $worker: {
      createRejexWorker: () => Worker
    }
  }
}
