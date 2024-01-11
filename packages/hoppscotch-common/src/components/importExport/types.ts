import { Component, Ref } from "vue"
import { defineStep } from "~/composables/step-components"

// TODO: move the metadata except disabled and isLoading to importers.ts
export type ImporterOrExporter = {
  metadata: {
    id: string
    name: string
    icon: any
    title: string
    disabled: boolean
    applicableTo: Array<"personal-workspace" | "team-workspace" | "url-import">
    isLoading?: Ref<boolean>
  }
  supported_sources?: {
    id: string
    name: string
    icon: Component
    step: ReturnType<typeof defineStep>
  }[]
  component?: ReturnType<typeof defineStep>
  action?: (...args: any[]) => any
}
