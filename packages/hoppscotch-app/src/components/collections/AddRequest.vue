<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('request.new')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelAddRequest"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addRequest"
        />
        <label for="selectLabelAddRequest">{{ t("action.label") }}</label>
      </div>
    </template>
    <template #footer>
      <span class="flex">
        <ButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          @click="addRequest"
        />
        <ButtonSecondary :label="t('action.cancel')" @click="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { getRESTRequest } from "~/newstore/RESTSession"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  loadingState: boolean
  folder?: object
  folderPath?: string
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (
    e: "add-request",
    v: {
      name: string
      folder: object | undefined
      path: string | undefined
    }
  ): void
}>()

const name = ref("")

watch(
  () => props.show,
  (show) => {
    if (show) {
      name.value = getRESTRequest().name
    }
  }
)

const addRequest = () => {
  if (!name.value) {
    toast.error(`${t("error.empty_req_name")}`)
    return
  }
  emit("add-request", {
    name: name.value,
    folder: props.folder,
    path: props.folderPath,
  })
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
