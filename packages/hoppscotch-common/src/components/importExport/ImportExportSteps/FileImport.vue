<template>
  <div class="space-y-4">
    <p class="flex items-center">
      <span
        class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary text-dividerDark"
        :class="{
          '!text-green-500': hasFile,
        }"
      >
        <icon-lucide-check-circle class="svg-icons" />
      </span>
      <span>
        {{ t(`${caption}`) }}
      </span>
    </p>
    <div
      class="flex flex-col ml-10 border border-dashed rounded border-dividerDark"
    >
      <input
        id="inputChooseFileToImportFrom"
        ref="inputChooseFileToImportFrom"
        name="inputChooseFileToImportFrom"
        type="file"
        class="p-4 cursor-pointer transition file:transition file:cursor-pointer text-secondary hover:text-secondaryDark file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-secondary hover:file:text-secondaryDark file:bg-primaryLight hover:file:bg-primaryDark"
        :accept="acceptedFileTypes"
        multiple
        @change="onFileChange"
      />
    </div>

    <div>
      <HoppButtonPrimary
        class="w-full"
        :label="t('import.title')"
        :disabled="!hasFile"
        @click="emit('importFromFile', fileContent)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

defineProps<{
  caption: string
  acceptedFileTypes: string
}>()

const t = useI18n()
const toast = useToast()

const hasFile = ref(false)
const fileContent = ref<string[]>([])

const inputChooseFileToImportFrom = ref<HTMLInputElement | any>()

const emit = defineEmits<{
  (e: "importFromFile", content: string[]): void
}>()

const onFileChange = async () => {
  const inputFileToImport = inputChooseFileToImportFrom.value

  if (!inputFileToImport) {
    hasFile.value = false
    return
  }

  if (!inputFileToImport.files || inputFileToImport.files.length === 0) {
    inputChooseFileToImportFrom.value = ""
    hasFile.value = false
    toast.show(t("action.choose_file").toString())
    return
  }

  const readerPromises: Promise<string | null>[] = []

  for (let i = 0; i < inputFileToImport.files.length; i++) {
    const file = inputFileToImport.files[i]
    const reader = new FileReader()

    readerPromises.push(
      new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string | null)
        reader.readAsText(file)
      })
    )
  }

  const contents = await Promise.all(readerPromises)

  const contentsArr = contents.filter(Boolean) as string[]
  fileContent.value = contentsArr

  hasFile.value = contentsArr.length > 0
}
</script>
