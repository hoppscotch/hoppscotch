<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('modal.edit_request')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelEditReq"
          v-model="requestUpdateData.name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="saveRequest"
        />
        <label for="selectLabelEditReq">
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <ButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="saveRequest"
        />
        <ButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  loadingState: boolean
  editingRequestName: string
}>()

const emit = defineEmits<{
  (e: "submit", requestUpdateData: { name: string }): void
  (e: "hide-modal"): void
}>()

const requestUpdateData = ref({
  name: "",
})

watch(
  () => props.editingRequestName,
  (newName) => {
    requestUpdateData.value.name = newName
  }
)

const saveRequest = () => {
  if (!requestUpdateData.value.name) {
    toast.error(t("request.invalid_name"))
    return
  }

  emit("submit", requestUpdateData.value)
}

const hideModal = () => {
  requestUpdateData.value.name = ""
  emit("hide-modal")
}
</script>
