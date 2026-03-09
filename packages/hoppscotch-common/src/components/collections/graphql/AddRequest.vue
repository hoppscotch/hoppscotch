<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('request.new')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex gap-1 items-center">
        <HoppSmartInput
          v-model="editingName"
          class="flex-grow"
          placeholder=" "
          :label="t('action.label')"
          input-styles="floating-input"
          @submit="addRequest"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between items-center w-full">
        <div class="flex space-x-2">
          <HoppButtonPrimary
            :label="t('action.save')"
            outline
            @click="addRequest"
          />
          <HoppButtonSecondary
            :label="t('action.cancel')"
            outline
            filled
            @click="hideModal"
          />
        </div>
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { ref } from "vue"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  folderPath?: string
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (
    e: "add-request",
    v: {
      name: string
      path: string | undefined
    }
  ): void
}>()

const editingName = ref("")

const addRequest = () => {
  if (!editingName.value) {
    toast.error(`${t("error.empty_req_name")}`)
    return
  }
  emit("add-request", {
    name: editingName.value,
    path: props.folderPath,
  })
  hideModal()
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
