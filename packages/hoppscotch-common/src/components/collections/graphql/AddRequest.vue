<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('request.new')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <HoppSmartInput
        v-model="editingName"
        placeholder=" "
        :label="t('action.label')"
        input-styles="floating-input"
        @submit="addRequest"
      />
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

const editingName = ref("")

watch(
  () => props.show,
  (show) => {
    if (show) {
      editingName.value = getGQLSession().request.name
    }
  }
)

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
