<template>
  <HoppSmartModal
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
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="addRequest"
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
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { currentActiveTab } from "~/helpers/rest/tab"

const toast = useToast()
const t = useI18n()

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState: boolean
  }>(),
  {
    show: false,
    loadingState: false,
  }
)

const emit = defineEmits<{
  (event: "hide-modal"): void
  (event: "add-request", name: string): void
}>()

const name = ref("")

watch(
  () => props.show,
  (show) => {
    if (show) {
      name.value = currentActiveTab.value.document.request.name
    }
  }
)

const addRequest = () => {
  if (name.value.trim() === "") {
    toast.error(`${t("error.empty_req_name")}`)
    return
  }
  emit("add-request", name.value)
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
