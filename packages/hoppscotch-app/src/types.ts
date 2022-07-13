import { App } from "vue";

type ModuleInput = {
  app: App
}

export type HoppModule = (input: ModuleInput) => void
