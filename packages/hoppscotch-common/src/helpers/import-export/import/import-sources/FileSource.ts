import FileImportVue from "~/components/importExport/ImportExportSteps/FileImport.vue"
import { defineStep } from "~/composables/step-components"

import { v4 as uuidv4 } from "uuid"
import { unref, type Ref } from "vue"

export function FileSource(metadata: {
  acceptedFileTypes: string
  caption: string
  actionLabel?: string
  onImportFromFile: (content: string[], ...args: any[]) => any | Promise<any>
  isLoading?: Ref<boolean>
  description?: string
  showPostmanScriptOption?: boolean
  showUpdateOptions?: boolean
  lastFileName?: string | Ref<string | undefined>
  lastUpdated?: number | Ref<number | undefined>
}) {
  const stepID = uuidv4()

  return defineStep(stepID, FileImportVue, () => ({
    acceptedFileTypes: metadata.acceptedFileTypes,
    caption: metadata.caption,
    actionLabel: metadata.actionLabel,
    onImportFromFile: metadata.onImportFromFile,
    loading: metadata.isLoading?.value,
    description: metadata.description,
    showPostmanScriptOption: metadata.showPostmanScriptOption,
    showUpdateOptions: metadata.showUpdateOptions,
    lastFileName: unref(metadata.lastFileName),
    lastUpdated: unref(metadata.lastUpdated),
  }))
}
