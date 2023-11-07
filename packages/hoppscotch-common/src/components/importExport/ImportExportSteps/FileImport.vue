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
const fileContent = ref("")

const inputChooseFileToImportFrom = ref<HTMLInputElement | any>()

const emit = defineEmits<{
  (e: "importFromFile", content: string): void
}>()

const onFileChange = () => {
  const inputFileToImport = inputChooseFileToImportFrom.value

  if (!inputFileToImport) {
    hasFile.value = false
    return
  }

  if (!inputFileToImport.files || inputFileToImport.files.length === 0) {
    inputChooseFileToImportFrom.value[0].value = ""
    hasFile.value = false
    toast.show(t("action.choose_file").toString())
    return
  }

  const reader = new FileReader()

  reader.onload = ({ target }) => {
    const content = target!.result as string | null
    if (!content) {
      hasFile.value = false
      toast.show(t("action.choose_file").toString())
      return
    }

    fileContent.value = content

    hasFile.value = !!content?.length
  }

  reader.readAsText(inputFileToImport.files[0])
}
</script>
