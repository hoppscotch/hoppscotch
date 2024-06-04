<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('request.generate_code')}`"
    @close="hideModal"
  >
    <template #body>
      <HttpCodegen @request-code="requestCode = $event" />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.copy')}`"
          :icon="copyCodeIcon"
          outline
          @click="copyRequestCode"
        />
        <HoppButtonSecondary
          :label="`${t('action.dismiss')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { refAutoReset } from "@vueuse/core"
import { ref, watch } from "vue"
import { copyToClipboard } from "~/helpers/utils/clipboard"

import { platform } from "~/platform"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"

const t = useI18n()

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const toast = useToast()

const copyCodeIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const requestCode = ref<string>("")

watch(
  () => props.show,
  (goingToShow) => {
    if (goingToShow) {
      platform.analytics?.logEvent({
        type: "HOPP_REST_CODEGEN_OPENED",
      })
    }
  }
)

const hideModal = () => emit("hide-modal")

const copyRequestCode = () => {
  copyToClipboard(requestCode.value)
  copyCodeIcon.value = IconCheck
  toast.success(`${t("state.copied_to_clipboard")}`)
}
</script>
