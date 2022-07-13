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
      class="flex flex-1 min-w-0 pl-4 py-2 transition group-hover:text-secondaryDark justify-between"
    >
      <span class="truncate rounded-sm select-all">
        {{ header.value }}
      </span>
      <ButtonSecondary
        ref="copyHeader"
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.copy')"
        :svg="copyIcon === 'copy' ? IconCopy : null"
        class="hidden group-hover:inline-flex !py-0"
        @click.native="copyHeader(header.value)"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import IconCopy from "~icons/lucide/copy"
import { refAutoReset } from "@vueuse/core"
import type { HoppRESTHeader } from "@hoppscotch/data"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

const t = useI18n()

const toast = useToast()

defineProps<{
  header: HoppRESTHeader
}>()

const copyIcon = refAutoReset<"copy" | "check">("copy", 1000)

const copyHeader = (headerValue: string) => {
  copyToClipboard(headerValue)
  copyIcon.value = "check"
  toast.success(`${t("state.copied_to_clipboard")}`)
}
</script>
