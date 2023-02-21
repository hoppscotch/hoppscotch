<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('app.developer_option')"
    @close="hideModal"
  >
    <template #body>
      <p class="px-2 mb-4 text-secondaryLight">
        {{ t("app.developer_option_description") }}
      </p>
      <div class="flex flex-1">
        <HoppButtonSecondary
          outline
          filled
          :icon="copyIcon"
          :label="t('app.copy_user_id')"
          @click="copyUserAuthToken"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { refAutoReset } from "@vueuse/core"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { platform } from "~/platform"

const t = useI18n()

const toast = useToast()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

// Copy user auth token to clipboard
const copyUserAuthToken = () => {
  const token = platform.auth.getDevOptsBackendIDToken()
  if (token) {
    copyToClipboard(token)
    copyIcon.value = IconCheck
    toast.success(`${t("state.copied_to_clipboard")}`)
  } else {
    toast.error(`${t("error.something_went_wrong")}`)
  }
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
