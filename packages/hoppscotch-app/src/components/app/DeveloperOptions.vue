<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('app.developer_option')"
    @close="hideModal"
  >
    <template #body>
      <p class="px-2 mb-8 text-secondaryLight">
        {{ t("app.developer_option_description") }}
      </p>
      <div class="flex flex-1">
        <button class="share-link" @click="copyUserAuthToken">
          <component :is="copyIcon" />
          <span>
            {{ t("app.copy_user_id") }}
          </span>
        </button>
      </div>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { refAutoReset } from "@vueuse/core"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useReadonlyStream } from "@composables/stream"
import { authIdToken$ } from "~/helpers/fb/auth"

const userAuthToken = useReadonlyStream(authIdToken$, null)

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
  if (userAuthToken.value) {
    copyToClipboard(userAuthToken.value)
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

<style lang="scss" scoped>
.share-link {
  @apply border border-dividerLight;
  @apply rounded;
  @apply flex;
  @apply p-3;
  @apply items-center;
  @apply justify-center;
  @apply font-semibold;
  @apply hover: (bg-primaryLight text-secondaryDark);
  @apply focus: outline-none;
  @apply focus-visible: border-divider;

  svg {
    @apply opacity-80;
    @apply mr-2;
  }

  &:hover {
    svg {
      @apply opacity-100;
    }
  }
}
</style>
