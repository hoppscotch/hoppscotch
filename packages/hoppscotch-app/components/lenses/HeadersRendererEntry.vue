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
        :svg="copyIcon"
        class="hidden group-hover:inline-flex !py-0"
        @click.native="copyHeader(header.value)"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import { HoppRESTHeader } from "~/../hoppscotch-data/dist"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n, useToast } from "~/helpers/utils/composables"

const t = useI18n()

const toast = useToast()

defineProps<{
  header: HoppRESTHeader
}>()

const copyIcon = ref("copy")

const copyHeader = (headerValue: string) => {
  copyToClipboard(headerValue)
  copyIcon.value = "check"
  toast.success(`${t("state.copied_to_clipboard")}`)
  setTimeout(() => (copyIcon.value = "copy"), 1000)
}
</script>
