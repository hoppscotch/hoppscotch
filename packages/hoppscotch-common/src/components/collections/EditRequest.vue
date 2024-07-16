<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('modal.edit_request')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex items-center space-x-2">
        <div class="flex-grow">
          <HoppSmartInput
            v-model="editingName"
            placeholder=" "
            :label="t('action.label')"
            input-styles="floating-input"
            @submit="editRequest"
          />
        </div>
        <div class="flex-shrink-0">
          <HoppButtonSecondary
            :label="autoRenameButtonLabel"
            outline
            filled
            :disabled="isAutoRenaming"
            @click="autoRename"
          />
        </div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="editRequest"
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
import { ref, computed } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useVModel } from "@vueuse/core"
import axios from "axios"
import { HoppRESTRequest } from "@hoppscotch/data"

const toast = useToast()
const t = useI18n()

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState: boolean
    modelValue?: string
    requestContext: HoppRESTRequest | null
  }>(),
  {
    show: false,
    loadingState: false,
    modelValue: "",
  }
)

const emit = defineEmits<{
  (e: "submit", name: string): void
  (e: "hide-modal"): void
  (e: "update:modelValue", value: string): void
}>()

const editingName = useVModel(props, "modelValue")
const isAutoRenaming = ref(false)

const autoRenameButtonLabel = computed(() =>
  isAutoRenaming.value ? t("action.auto_renaming") : t("action.auto_rename")
)

const editRequest = () => {
  if (editingName.value.trim() === "") {
    toast.error(t("request.invalid_name"))
    return
  }

  emit("submit", editingName.value)
}

const hideModal = () => {
  editingName.value = ""
  emit("hide-modal")
}

const autoRename = async () => {
  isAutoRenaming.value = true

  const testCase = {
    method: props.requestContext?.method || "",
    api_url: props.requestContext?.endpoint || "",
    params: props.requestContext?.params || {},
    body: props.requestContext?.body || null,
    headers: props.requestContext?.headers || {},
    authorization: props.requestContext?.auth || "",
  }

  try {
    const response = await axios.post(
      "https://hoppscotch-aiwg-production.up.railway.app/name-api-req",
      { test_data: JSON.stringify(testCase) }
    )

    const suggestedName = response.data.endpoint_name
    editingName.value = suggestedName

    toast.success(t("auto_rename.success"))
  } catch (error) {
    console.error("Error in autoRename:", error)
    toast.error(t("auto_rename.error"))
  } finally {
    isAutoRenaming.value = false
  }
}

// TODO :
// - get details from the actual tab to this API thing

// Claude Chat References
// https://claude.ai/chat/09bfa15e-1151-4886-94b8-55d9959b5297 - Initial Button Working

// https://www.figma.com/design/Q66KyyZPapTAE1j4Zbvz7K/Untitled?node-id=0-1 - Figma file about implementation
// https://github.com/Govind-S-B/HOPPSCOTCH-AI-EXPERIMENT---BATCH-A - Backend REPO
// https://hoppscotch-aiwg-production.up.railway.app/ - Backend API
</script>
