<template>
  <div
    class="flex border-b divide-x divide-dividerLight border-dividerLight group"
  >
    <span
      class="flex flex-1 min-w-0 px-4 py-2 transition group-hover:text-secondaryDark"
    >
      <span class="truncate rounded-sm select-all">
        {{ header.key }}
      </span>
    </span>
    <span
      class="flex justify-between flex-1 min-w-0 py-2 pl-4 transition group-hover:text-secondaryDark"
    >
      <span class="truncate rounded-sm select-all">
        {{ header.value }}
      </span>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.copy')"
        :icon="copyIcon"
        class="hidden group-hover:inline-flex !py-0"
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
