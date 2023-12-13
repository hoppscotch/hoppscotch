<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('folder.new')"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartInput
        v-model="name"
        placeholder=" "
        :label="t('action.label')"
        input-styles="floating-input"
        @submit="addFolder"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          outline
          @click="addFolder"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  show: boolean
  folderPath?: string
  collectionIndex: number
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (
    e: "add-folder",
    v: {
      name: string
      path: string | undefined
    }
  ): void
}>()

const name = ref<string | null>(null)

const addFolder = () => {
  if (!name.value) {
    toast.error(`${t("folder.name_length_insufficient")}`)
    return
  }

  emit("add-folder", {
    name: name.value,
    path: props.folderPath || `${props.collectionIndex}`,
  })

  hideModal()
}

const hideModal = () => {
  name.value = null
  emit("hide-modal")
}
</script>
