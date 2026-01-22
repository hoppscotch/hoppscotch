import GitFolderImport from "~/components/importExport/ImportExportSteps/GitFolderImport.vue"
import { defineStep } from "~/composables/step-components"

import { v4 as uuidv4 } from "uuid"
import { Ref } from "vue"

// Type declarations for File System Access API
interface FileSystemDirectoryHandle {
  name: string
  kind: "directory"
  getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileSystemFileHandle>
  [Symbol.asyncIterator]: () => AsyncIterableIterator<
    [string, FileSystemHandle]
  >
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>
  close(): Promise<void>
}

export function GitSource(metadata: {
  caption: string
  onInit: (
    folderHandle: FileSystemDirectoryHandle,
    branch: string
  ) => any | Promise<any>
  isLoading?: Ref<boolean>
  description?: string
  onClose?: () => void
}) {
  const stepID = uuidv4()

  return defineStep(stepID, GitFolderImport, () => ({
    caption: metadata.caption,
    description: metadata.description,
    onInit: metadata.onInit,
    onClose: metadata.onClose,
    loading: metadata.isLoading?.value,
  }))
}
