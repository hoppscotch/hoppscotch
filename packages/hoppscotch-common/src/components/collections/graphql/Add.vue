<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('collection.new')}`"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartInput
        v-model="name"
        placeholder=" "
        input-styles="floating-input"
        :label="t('action.label')"
        @submit="addNewCollection"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
          outline
          @click="addNewCollection"
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
import { ref } from "vue"

const t = useI18n()
const toast = useToast()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "submit", name: string): void
}>()

const name = ref<string | null>(null)

const addNewCollection = () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  emit("submit", name.value)

  hideModal()
}

const hideModal = () => {
  name.value = null
  emit("hide-modal")
}
</script>
