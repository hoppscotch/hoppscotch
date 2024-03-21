<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('folder.edit')}`"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <HoppSmartInput
        v-model="name"
        placeholder=" "
        :label="t('action.label')"
        input-styles="floating-input"
        @submit="editFolder"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
          outline
          @click="editFolder"
        />
        <HoppButtonSecondary
          :label="`${t('action.cancel')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { editGraphqlFolder } from "~/newstore/collections"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  show: boolean
  folderPath?: string
  folder: any
  editingFolderName: string
}>()

const emit = defineEmits(["hide-modal"])

const name = ref("")

watch(
  () => props.editingFolderName,
  (val) => {
    name.value = val
  }
)

const editFolder = () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }
  editGraphqlFolder(props.folderPath, {
    ...(props.folder as any),
    name: name.value,
  })
  hideModal()
}

const hideModal = () => {
  name.value = ""
  emit("hide-modal")
}
</script>
