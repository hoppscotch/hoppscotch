<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('request.new')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelGqlAddRequest"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addRequest"
        />
        <label for="selectLabelGqlAddRequest">
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
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
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { getGQLSession } from "~/newstore/GQLSession"

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

const name = ref("")

watch(
  () => props.show,
  (show) => {
    if (show) {
      name.value = getGQLSession().request.name
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
    path: props.folderPath,
  })
  hideModal()
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
