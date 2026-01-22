<template>
  <div class="space-y-4">
    <div>
      <p class="flex items-center">
        <span
          class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary text-dividerDark"
          :class="{
            '!text-green-500': hasSelectedFolder,
          }"
        >
          <icon-lucide-check-circle class="svg-icons" />
        </span>
        <span>
          {{ t(caption) }}
        </span>
      </p>

      <p v-if="description" class="ml-10 mt-2 text-secondaryLight">
        {{ t(description) }}
      </p>
    </div>

    <div class="flex flex-col border border-dashed rounded border-dividerDark">
      <HoppButtonSecondary
        class="w-full m-4 ml-0"
        :label="
          selectedFolderName
            ? `Selected: ${selectedFolderName}`
            : 'Select Git Repository Folder'
        "
        :icon="IconFolder"
        @click="selectFolder"
      />
    </div>

    <div>
      <HoppButtonPrimary
        class="w-full"
        :label="t('import.title')"
        :disabled="disableInitCTA"
        :loading="loading"
        @click="handleInit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import IconFolder from "~icons/lucide/folder"
import { HoppButtonPrimary, HoppButtonSecondary } from "@hoppscotch/ui"
import { useI18n } from "~/composables/i18n"

// Type declarations for File System Access API
declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>
  }
}

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

const t = useI18n()

const props = withDefaults(
  defineProps<{
    caption: string
    description?: string
    loading?: boolean
    onInit: (
      folderHandle: FileSystemDirectoryHandle,
      branch: string
    ) => void | Promise<void>
    onClose?: () => void
  }>(),
  { loading: false, description: undefined, onClose: undefined }
)

const selectedFolderHandle = ref<FileSystemDirectoryHandle | null>(null)
const selectedFolderName = ref<string>("")
const BRANCH = "main" // Always use main branch

const hasSelectedFolder = computed(() => !!selectedFolderHandle.value)
const disableInitCTA = computed(() => !hasSelectedFolder.value || props.loading)

const selectFolder = async () => {
  if (!window.showDirectoryPicker) {
    alert("File System Access API is not supported in this browser.")
    return
  }

  try {
    const handle = await window.showDirectoryPicker()
    selectedFolderHandle.value = handle
    selectedFolderName.value = handle.name
  } catch (error: any) {
    // User cancelled the picker
    if (error.name !== "AbortError") {
      console.error("Failed to select folder:", error)
      alert("Failed to select folder. Please try again.")
    }
  }
}

const handleInit = async () => {
  if (!selectedFolderHandle.value) {
    return
  }

  await props.onInit(selectedFolderHandle.value, BRANCH)

  // Close modal after successful initialization
  if (props.onClose) {
    props.onClose()
  }
}
</script>
