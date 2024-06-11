<template>
  <HoppSmartModal
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
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { onMounted, ref } from "vue"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  editingFolderName: string
}>()

const emit = defineEmits(["submit", "hide-modal"])

const name = ref<string | null>(null)

onMounted(() => {
  name.value = props.editingFolderName
})

const editFolder = () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  emit("submit", name.value)
  hideModal()
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
