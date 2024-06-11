<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('modal.edit_request')}`"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartInput
        v-model="editingName"
        placeholder=" "
        :label="t('action.label')"
        input-styles="floating-input"
        @submit="saveRequest"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
          outline
          @click="saveRequest"
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
import { ref, watch } from "vue"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  show: boolean
  editingRequestName: string
}>()

const emit = defineEmits<{
  (e: "submit", name: string): void
  (e: "hide-modal"): void
}>()

const editingName = ref<string | null>(null)

watch(
  () => props.editingRequestName,
  (val) => {
    editingName.value = val
  }
)

const saveRequest = () => {
  if (!editingName.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  emit("submit", editingName.value)
  hideModal()
}

const hideModal = () => {
  editingName.value = null
  emit("hide-modal")
}
</script>
