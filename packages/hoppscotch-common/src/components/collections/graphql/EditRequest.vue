<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('modal.edit_request')}`"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartInput
        v-model="requestUpdateData.name"
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
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { HoppGQLRequest } from "@hoppscotch/data"
import { editGraphqlRequest } from "~/newstore/collections"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  show: boolean
  folderPath?: string
  requestIndex: number | null
  request: HoppGQLRequest | null
  editingRequestName: string
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const requestUpdateData = ref({ name: null as string | null })

watch(
  () => props.editingRequestName,
  (val) => {
    requestUpdateData.value.name = val
  }
)

const saveRequest = () => {
  if (!requestUpdateData.value.name) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  const requestUpdated = {
    ...(props.request as any),
    name: requestUpdateData.value.name || (props.request as any).name,
  }

  editGraphqlRequest(props.folderPath, props.requestIndex, requestUpdated)

  hideModal()
}

const hideModal = () => {
  requestUpdateData.value = { name: null }
  emit("hide-modal")
}
</script>
