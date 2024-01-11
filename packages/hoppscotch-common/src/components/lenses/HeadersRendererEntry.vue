<template>
  <div
    class="group flex divide-x divide-dividerLight border-b border-dividerLight"
  >
    <span
      class="flex min-w-0 flex-1 px-4 py-2 transition group-hover:text-secondaryDark"
    >
      <span class="select-all truncate rounded-sm">
        {{ header.key }}
      </span>
    </span>
    <span
      class="flex min-w-0 flex-1 justify-between py-2 pl-4 transition group-hover:text-secondaryDark"
    >
      <span class="select-all truncate rounded-sm">
        {{ header.value }}
      </span>
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.copy')"
        :icon="copyIcon"
        class="hidden !py-0 group-hover:inline-flex"
        @click="copyHeader(header.value)"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import { refAutoReset } from "@vueuse/core"
import type { HoppRESTResponseHeader } from "~/helpers/types/HoppRESTResponse"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

const t = useI18n()

const toast = useToast()

defineProps<{
  header: HoppRESTResponseHeader
}>()

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const copyHeader = (headerValue: string) => {
  copyToClipboard(headerValue)
  copyIcon.value = IconCheck
  toast.success(`${t("state.copied_to_clipboard")}`)
}
</script>
