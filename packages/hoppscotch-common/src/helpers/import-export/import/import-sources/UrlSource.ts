import UrlImport from "~/components/importExport/ImportExportSteps/UrlImport.vue"
import { defineStep } from "~/composables/step-components"

import { v4 as uuidv4 } from "uuid"
import { Ref, unref } from "vue"

export function UrlSource(metadata: {
  caption: string
  actionLabel?: string
  onImportFromURL: (content: string, ...args: any[]) => any | Promise<any>
  fetchLogic?: (url: string) => Promise<any>
  isLoading?: Ref<boolean>
  description: string
  showUpdateOptions?: boolean
  initialUrl?: string | Ref<string | undefined>
}) {
  const stepID = uuidv4()

  return defineStep(stepID, UrlImport, () => ({
    caption: metadata.caption,
    actionLabel: metadata.actionLabel,
    onImportFromURL: (content: unknown, ...args: any[]) => {
      if (typeof content === "string") {
        metadata.onImportFromURL(content, ...args)
      }
    },
    loading: metadata.isLoading?.value,
    description: metadata.description,
    showUpdateOptions: metadata.showUpdateOptions,
    initialUrl: unref(metadata.initialUrl),
  }))
}
