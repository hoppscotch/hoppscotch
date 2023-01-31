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
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="editRequest"
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
          @click="editRequest"
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

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState: boolean
    editingRequestName: string
  }>(),
  {
    show: false,
    loadingState: false,
    editingRequestName: "",
  }
)

const emit = defineEmits<{
  (e: "submit", name: string): void
  (e: "hide-modal"): void
}>()

const name = ref("")

watch(
  () => props.editingRequestName,
  (newName) => {
    name.value = newName
  }
)

const editRequest = () => {
  if (name.value.trim() === "") {
    toast.error(t("request.invalid_name"))
    return
  }

  emit("submit", name.value)
}

const hideModal = () => {
  name.value = ""
  emit("hide-modal")
}
</script>
